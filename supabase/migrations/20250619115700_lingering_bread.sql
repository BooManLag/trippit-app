/*
  # Token-Based Trip Invitation System

  1. New Tables
    - trip_invitations: Token-based email invitations
    - trip_participants: Track who has access to trips

  2. Security
    - Only trip owners can send invitations
    - Token-based acceptance for security
    - Clean RLS policies without recursion

  3. Features
    - Email-based invitations with secure tokens
    - No cloning - single source of truth
    - Simple participant management
*/

-- First, let's add max_participants to trips if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'max_participants'
  ) THEN
    ALTER TABLE trips ADD COLUMN max_participants integer DEFAULT 2 CHECK (max_participants >= 1 AND max_participants <= 20);
  END IF;
END $$;

-- Create trip_participants table
CREATE TABLE IF NOT EXISTS trip_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'participant' CHECK (role IN ('owner', 'participant')),
  joined_at timestamptz DEFAULT now(),
  
  UNIQUE(trip_id, user_id)
);

-- Create trip_invitations table with tokens
CREATE TABLE IF NOT EXISTS trip_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  
  UNIQUE(trip_id, invitee_email)
);

-- Enable RLS
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trip_participants
CREATE POLICY "participants_read_own_trips"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

CREATE POLICY "participants_manage_own"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for trip_invitations
CREATE POLICY "owners_can_invite"
  ON trip_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_id = auth.uid() AND
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

CREATE POLICY "owners_read_invitations"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    inviter_id = auth.uid() OR
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

CREATE POLICY "invitees_read_own"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "invitees_update_status"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Update trips RLS policies
DROP POLICY IF EXISTS "trips_owner_full_access" ON trips;
DROP POLICY IF EXISTS "trips_invited_read" ON trips;
DROP POLICY IF EXISTS "trips_anonymous_read" ON trips;

CREATE POLICY "trips_owner_full_access"
  ON trips
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trips_participants_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT trip_id FROM trip_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "trips_invited_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT trip_id FROM trip_invitations 
      WHERE invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND status = 'pending'
    )
  );

CREATE POLICY "trips_anonymous_read"
  ON trips
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- Update users RLS policies
DROP POLICY IF EXISTS "users_own_data" ON users;
DROP POLICY IF EXISTS "users_invitation_context_read" ON users;

CREATE POLICY "users_own_data"
  ON users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_invitation_context_read"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT inviter_id FROM trip_invitations 
      WHERE invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Function to accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(p_token text)
RETURNS TABLE(success boolean, message text, trip_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation trip_invitations%ROWTYPE;
  v_user_id uuid;
  v_user_email text;
  v_trip trips%ROWTYPE;
  v_participant_count integer;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not authenticated', null::uuid;
    RETURN;
  END IF;

  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  -- Get invitation by token
  SELECT * INTO v_invitation 
  FROM trip_invitations 
  WHERE token = p_token AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid or expired invitation', null::uuid;
    RETURN;
  END IF;
  
  -- Verify the invitation is for this user's email
  IF v_invitation.invitee_email != v_user_email THEN
    RETURN QUERY SELECT false, 'This invitation is not for your email address', null::uuid;
    RETURN;
  END IF;
  
  -- Get trip details
  SELECT * INTO v_trip FROM trips WHERE id = v_invitation.trip_id;
  
  -- Check if trip is full
  SELECT COUNT(*) INTO v_participant_count 
  FROM trip_participants 
  WHERE trip_id = v_invitation.trip_id;
  
  IF v_participant_count >= v_trip.max_participants THEN
    RETURN QUERY SELECT false, 'Trip is full', null::uuid;
    RETURN;
  END IF;
  
  -- Check if user is already a participant
  IF EXISTS (
    SELECT 1 FROM trip_participants 
    WHERE trip_id = v_invitation.trip_id AND user_id = v_user_id
  ) THEN
    -- Update invitation status anyway
    UPDATE trip_invitations 
    SET status = 'accepted', responded_at = now()
    WHERE id = v_invitation.id;
    
    RETURN QUERY SELECT true, 'You are already a participant in this trip', v_invitation.trip_id;
    RETURN;
  END IF;
  
  -- Add user as participant
  INSERT INTO trip_participants (trip_id, user_id, role)
  VALUES (v_invitation.trip_id, v_user_id, 'participant');
  
  -- Update invitation status
  UPDATE trip_invitations 
  SET status = 'accepted', responded_at = now()
  WHERE id = v_invitation.id;
  
  RETURN QUERY SELECT true, 'Successfully joined the trip!', v_invitation.trip_id;
END;
$$;

-- Function to automatically add trip owner as participant
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add participant if user_id is not null (authenticated trip)
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to add owner as participant
DROP TRIGGER IF EXISTS on_trip_created ON trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS trip_participants_trip_id_idx ON trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS trip_participants_user_id_idx ON trip_participants(user_id);
CREATE INDEX IF NOT EXISTS trip_invitations_token_idx ON trip_invitations(token);
CREATE INDEX IF NOT EXISTS trip_invitations_trip_id_idx ON trip_invitations(trip_id);
CREATE INDEX IF NOT EXISTS trip_invitations_invitee_email_idx ON trip_invitations(invitee_email);