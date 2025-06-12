/*
  # Create Trip Invitation System

  1. New Tables
    - `trip_invitations`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, references trips)
      - `inviter_id` (uuid, references users - the trip owner)
      - `invitee_email` (text, the email of person being invited)
      - `status` ('pending' | 'accepted' | 'declined')
      - `created_at` (timestamp)
      - `responded_at` (timestamp, nullable)

    - `trip_participants`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, references trips)
      - `user_id` (uuid, references users)
      - `email` (text, for consistency)
      - `role` ('owner' | 'participant')
      - `joined_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for invitation management
    - Add policies for participant management

  3. Functions
    - Function to respond to invitations
    - Function to check if user can join trip
*/

-- Create trip_invitations table
CREATE TABLE IF NOT EXISTS trip_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  
  -- Ensure one invitation per email per trip
  UNIQUE(trip_id, invitee_email)
);

-- Create trip_participants table
CREATE TABLE IF NOT EXISTS trip_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'participant' CHECK (role IN ('owner', 'participant')),
  joined_at timestamptz DEFAULT now(),
  
  -- Ensure one participation per user per trip
  UNIQUE(trip_id, user_id)
);

-- Enable RLS
ALTER TABLE trip_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;

-- Policies for trip_invitations
CREATE POLICY "invitations_owner_manage"
  ON trip_invitations
  FOR ALL
  TO authenticated
  USING (
    inviter_id = auth.uid() OR
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    inviter_id = auth.uid() OR
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "invitations_invitee_read"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "invitations_invitee_update"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Policies for trip_participants
CREATE POLICY "participants_trip_access"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    trip_id IN (
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
    ) OR
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "participants_owner_manage"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "participants_self_manage"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to respond to invitation and join trip
CREATE OR REPLACE FUNCTION respond_to_invitation(
  p_invitation_id uuid,
  p_response text
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation trip_invitations%ROWTYPE;
  v_trip trips%ROWTYPE;
  v_current_participants integer;
  v_user_id uuid;
  v_user_email text;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not authenticated';
    RETURN;
  END IF;

  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  -- Get invitation
  SELECT * INTO v_invitation 
  FROM trip_invitations 
  WHERE id = p_invitation_id AND invitee_email = v_user_email;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invitation not found or not for this user';
    RETURN;
  END IF;
  
  IF v_invitation.status != 'pending' THEN
    RETURN QUERY SELECT false, 'Invitation already responded to';
    RETURN;
  END IF;
  
  -- Get trip details
  SELECT * INTO v_trip FROM trips WHERE id = v_invitation.trip_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Trip not found';
    RETURN;
  END IF;
  
  -- Update invitation status
  UPDATE trip_invitations 
  SET status = p_response, responded_at = now()
  WHERE id = p_invitation_id;
  
  -- If accepted, add to participants
  IF p_response = 'accepted' THEN
    -- Check if trip is full
    SELECT COUNT(*) INTO v_current_participants 
    FROM trip_participants 
    WHERE trip_id = v_invitation.trip_id;
    
    IF v_current_participants >= v_trip.max_participants THEN
      RETURN QUERY SELECT false, 'Trip is full';
      RETURN;
    END IF;
    
    -- Check if user is already a participant
    IF EXISTS (
      SELECT 1 FROM trip_participants 
      WHERE trip_id = v_invitation.trip_id AND user_id = v_user_id
    ) THEN
      RETURN QUERY SELECT false, 'Already a participant in this trip';
      RETURN;
    END IF;
    
    -- Add user as participant
    INSERT INTO trip_participants (trip_id, user_id, email, role)
    VALUES (v_invitation.trip_id, v_user_id, v_user_email, 'participant');
    
    RETURN QUERY SELECT true, 'Successfully joined the trip!';
  ELSE
    RETURN QUERY SELECT true, 'Invitation declined';
  END IF;
END;
$$;

-- Function to automatically add trip owner as participant
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email text;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = NEW.user_id;
  
  -- Add owner as participant
  INSERT INTO trip_participants (trip_id, user_id, email, role)
  VALUES (NEW.id, NEW.user_id, v_user_email, 'owner');
  
  RETURN NEW;
END;
$$;

-- Trigger to automatically add trip owner as participant
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();

-- Update trips table policies to include participant access
DROP POLICY IF EXISTS "trips_owner_full_access" ON trips;
DROP POLICY IF EXISTS "trips_anonymous_read" ON trips;

CREATE POLICY "trips_owner_full_access"
  ON trips
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trips_participant_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "trips_invited_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT trip_id FROM trip_invitations 
      WHERE invitee_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      ) AND status = 'pending'
    )
  );

CREATE POLICY "trips_anonymous_read"
  ON trips
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- Update users table policies to allow reading for trip context
DROP POLICY IF EXISTS "users_own_data" ON users;

CREATE POLICY "users_own_data"
  ON users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_trip_context_read"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT user_id FROM trip_participants 
      WHERE trip_id IN (
        SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
      )
    )
    OR
    id IN (
      SELECT inviter_id FROM trip_invitations 
      WHERE invitee_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );