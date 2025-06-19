/*
  # Denormalized Participants Array Solution

  1. Database Changes
    - Add participant_ids array column to trips table
    - Create trip_participants table for detailed participant data
    - Create trip_invitations table with secure tokens
    - Add triggers to sync participant_ids array automatically

  2. Security
    - Simple RLS policies using array operations
    - No circular dependencies or infinite recursion
    - SECURITY DEFINER functions for complex operations

  3. Features
    - Email-based invitations with secure tokens
    - Automatic participant synchronization
    - Clean, maintainable policies
*/

-- Add participant_ids array to trips table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'participant_ids'
  ) THEN
    ALTER TABLE trips ADD COLUMN participant_ids uuid[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- Add max_participants to trips if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'max_participants'
  ) THEN
    ALTER TABLE trips ADD COLUMN max_participants integer DEFAULT 2 CHECK (max_participants >= 1 AND max_participants <= 20);
  END IF;
END $$;

-- Create trip_participants table for detailed participant data
CREATE TABLE IF NOT EXISTS trip_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'participant' CHECK (role IN ('owner', 'participant')),
  joined_at timestamptz DEFAULT now(),
  
  UNIQUE(trip_id, user_id)
);

-- Create trip_invitations table with secure tokens
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

-- Enable RLS on all tables
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invitations ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies using denormalized participant_ids array
-- No circular dependencies!

-- TRIPS: Users can see trips they own or participate in
CREATE POLICY "trips_access_policy"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    auth.uid() = ANY(participant_ids)
  );

-- TRIPS: Only owners can modify trips
CREATE POLICY "trips_owner_modify"
  ON trips
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- TRIPS: Allow anonymous access to trips without owners
CREATE POLICY "trips_anonymous_access"
  ON trips
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- PARTICIPANTS: Users can see participants in trips they have access to
CREATE POLICY "participants_read_policy"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips 
      WHERE user_id = auth.uid() OR auth.uid() = ANY(participant_ids)
    )
  );

-- PARTICIPANTS: Users can manage their own participation
CREATE POLICY "participants_own_data"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- INVITATIONS: Only trip owners can create invitations
CREATE POLICY "invitations_owner_create"
  ON trip_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- INVITATIONS: Trip owners can read their invitations
CREATE POLICY "invitations_owner_read"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- INVITATIONS: Invitees can read and update their own invitations
CREATE POLICY "invitations_invitee_access"
  ON trip_invitations
  FOR ALL
  TO authenticated
  USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Trigger function to sync participant_ids array
CREATE OR REPLACE FUNCTION public.sync_participants()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Add user to participant_ids array
    UPDATE trips
    SET participant_ids = array_append(participant_ids, NEW.user_id)
    WHERE id = NEW.trip_id
    AND NOT (NEW.user_id = ANY(participant_ids)); -- Avoid duplicates
    
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    -- Remove user from participant_ids array
    UPDATE trips
    SET participant_ids = array_remove(participant_ids, OLD.user_id)
    WHERE id = OLD.trip_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create triggers to sync participant_ids
DROP TRIGGER IF EXISTS trg_tp_insert ON trip_participants;
DROP TRIGGER IF EXISTS trg_tp_delete ON trip_participants;

CREATE TRIGGER trg_tp_insert
  AFTER INSERT ON trip_participants
  FOR EACH ROW 
  EXECUTE FUNCTION sync_participants();

CREATE TRIGGER trg_tp_delete
  AFTER DELETE ON trip_participants
  FOR EACH ROW 
  EXECUTE FUNCTION sync_participants();

-- Function to add trip owner as participant when trip is created
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Only add participant if user_id is not null (authenticated trip)
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to add owner as participant
DROP TRIGGER IF EXISTS on_trip_created ON trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();

-- SECURITY DEFINER function to accept invitations
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
  
  -- Check if trip is full using the participant_ids array
  v_participant_count := array_length(v_trip.participant_ids, 1);
  IF v_participant_count IS NULL THEN
    v_participant_count := 0;
  END IF;
  
  IF v_participant_count >= v_trip.max_participants THEN
    RETURN QUERY SELECT false, 'Trip is full', null::uuid;
    RETURN;
  END IF;
  
  -- Check if user is already a participant using the array
  IF v_user_id = ANY(v_trip.participant_ids) THEN
    -- Update invitation status anyway
    UPDATE trip_invitations 
    SET status = 'accepted', responded_at = now()
    WHERE id = v_invitation.id;
    
    RETURN QUERY SELECT true, 'You are already a participant in this trip', v_invitation.trip_id;
    RETURN;
  END IF;
  
  -- Add user as participant (trigger will update participant_ids array)
  INSERT INTO trip_participants (trip_id, user_id, role)
  VALUES (v_invitation.trip_id, v_user_id, 'participant');
  
  -- Update invitation status
  UPDATE trip_invitations 
  SET status = 'accepted', responded_at = now()
  WHERE id = v_invitation.id;
  
  RETURN QUERY SELECT true, 'Successfully joined the trip!', v_invitation.trip_id;
END;
$$;

-- SECURITY DEFINER function to get user's trips (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_trips(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  destination text,
  start_date date,
  end_date date,
  max_participants integer,
  user_id uuid,
  participant_ids uuid[],
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    t.id,
    t.destination,
    t.start_date,
    t.end_date,
    t.max_participants,
    t.user_id,
    t.participant_ids,
    t.created_at
  FROM trips t
  WHERE t.user_id = p_user_id 
     OR p_user_id = ANY(t.participant_ids);
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS trips_participant_ids_idx ON trips USING GIN (participant_ids);
CREATE INDEX IF NOT EXISTS trip_participants_trip_id_idx ON trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS trip_participants_user_id_idx ON trip_participants(user_id);
CREATE INDEX IF NOT EXISTS trip_invitations_token_idx ON trip_invitations(token);
CREATE INDEX IF NOT EXISTS trip_invitations_trip_id_idx ON trip_invitations(trip_id);
CREATE INDEX IF NOT EXISTS trip_invitations_invitee_email_idx ON trip_invitations(invitee_email);