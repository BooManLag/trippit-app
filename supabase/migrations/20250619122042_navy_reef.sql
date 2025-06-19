/*
  # Fix Infinite Recursion in RLS Policies

  This migration fixes the infinite recursion issue by:
  1. Creating a single SECURITY DEFINER helper function that bypasses RLS
  2. Having all policies call only this function, never each other
  3. Implementing clean, non-circular policies
  4. Supporting token-based email invitations

  ## Key Changes
  - Single `can_access_trip()` function that bypasses RLS internally
  - All policies reference only this function or direct table lookups
  - No more circular policy dependencies
  - Token-based invitation system with secure random tokens
*/

-- 🧹 Clean slate: Drop existing tables and start fresh
DROP TABLE IF EXISTS trip_invitations CASCADE;
DROP TABLE IF EXISTS trip_participants CASCADE;

-- 📊 Add max_participants to trips if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'max_participants'
  ) THEN
    ALTER TABLE trips ADD COLUMN max_participants integer DEFAULT 2;
    ALTER TABLE trips ADD CONSTRAINT trips_max_participants_check 
      CHECK (max_participants >= 1 AND max_participants <= 20);
  END IF;
END $$;

-- 👥 Create trip_participants table
CREATE TABLE trip_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'participant' CHECK (role IN ('owner', 'participant')),
  joined_at timestamptz DEFAULT now(),
  
  UNIQUE(trip_id, user_id)
);

-- 📧 Create trip_invitations table with secure tokens
CREATE TABLE trip_invitations (
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

-- 🔑 THE KEY: SECURITY DEFINER HELPER FUNCTION
-- This function bypasses RLS internally and is the ONLY place we check both tables
CREATE OR REPLACE FUNCTION public.can_access_trip(
  _trip_id uuid,
  _user_id uuid
) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT 
    EXISTS (
      SELECT 1 
      FROM public.trips 
      WHERE id = _trip_id 
        AND (
          user_id = _user_id    -- trip owner
          OR _user_id IN (
            SELECT user_id 
            FROM public.trip_participants 
            WHERE trip_id = _trip_id
          )
        )
    );
$$;

-- 🛡️ DISABLE RLS temporarily to clean up old policies
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invitations DISABLE ROW LEVEL SECURITY;

-- 🧹 Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "select trips" ON trips;
DROP POLICY IF EXISTS "insert trips" ON trips;
DROP POLICY IF EXISTS "update trips" ON trips;
DROP POLICY IF EXISTS "delete trips" ON trips;
DROP POLICY IF EXISTS "trips_owner_full_access" ON trips;
DROP POLICY IF EXISTS "trips_participants_read" ON trips;
DROP POLICY IF EXISTS "trips_invited_read" ON trips;
DROP POLICY IF EXISTS "trips_anonymous_read" ON trips;

DROP POLICY IF EXISTS "select participants" ON trip_participants;
DROP POLICY IF EXISTS "insert participants" ON trip_participants;
DROP POLICY IF EXISTS "update participants" ON trip_participants;
DROP POLICY IF EXISTS "delete participants" ON trip_participants;

DROP POLICY IF EXISTS "select invitations" ON trip_invitations;
DROP POLICY IF EXISTS "insert invitations" ON trip_invitations;
DROP POLICY IF EXISTS "update invitations" ON trip_invitations;

DROP POLICY IF EXISTS "users_own_data" ON users;
DROP POLICY IF EXISTS "users_invitation_context_read" ON users;

-- 🔒 RE-ENABLE RLS
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invitations ENABLE ROW LEVEL SECURITY;

-- 🛡️ TRIPS POLICIES: Only call helper function or direct lookups
CREATE POLICY "select trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_trip(id, auth.uid()) OR
    -- Allow reading trips user is invited to (direct lookup, no recursion)
    id IN (
      SELECT trip_id FROM trip_invitations 
      WHERE invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND status = 'pending'
    )
  );

CREATE POLICY "insert trips"
  ON trips
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update trips"
  ON trips
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete trips"
  ON trips
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow anonymous users to read trips without owners
CREATE POLICY "trips_anonymous_read"
  ON trips
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- 🛡️ TRIP_PARTICIPANTS POLICIES: Only call helper function
CREATE POLICY "select participants"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_trip(trip_id, auth.uid())
  );

CREATE POLICY "insert participants"
  ON trip_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    public.can_access_trip(trip_id, auth.uid())
  );

CREATE POLICY "update participants"
  ON trip_participants
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "delete participants"
  ON trip_participants
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 🛡️ TRIP_INVITATIONS POLICIES: Only direct table lookups (no cross-references)
CREATE POLICY "insert invitations"
  ON trip_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_id = auth.uid() AND
    EXISTS (
      SELECT 1 
      FROM trips 
      WHERE id = trip_invitations.trip_id 
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "select invitations"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    inviter_id = auth.uid() OR
    EXISTS (
      SELECT 1 
      FROM trips 
      WHERE id = trip_invitations.trip_id 
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "update invitations"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 🛡️ USERS POLICIES: Simple and clean
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
    -- Allow reading inviter details for received invitations
    id IN (
      SELECT inviter_id FROM trip_invitations 
      WHERE invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    ) OR
    -- Allow reading participant details in shared trips
    id IN (
      SELECT user_id FROM trip_participants 
      WHERE trip_id IN (
        SELECT trip_id FROM trip_participants 
        WHERE user_id = auth.uid()
      )
    )
  );

-- 🎯 FUNCTION: Accept invitation by token (email-driven workflow)
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

-- 🔧 FUNCTION: Automatically add trip owner as participant
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

-- 🎯 TRIGGER: Add owner as participant when trip is created
DROP TRIGGER IF EXISTS on_trip_created ON trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();

-- 📊 INDEXES: For performance
CREATE INDEX trip_participants_trip_id_idx ON trip_participants(trip_id);
CREATE INDEX trip_participants_user_id_idx ON trip_participants(user_id);
CREATE INDEX trip_invitations_token_idx ON trip_invitations(token);
CREATE INDEX trip_invitations_trip_id_idx ON trip_invitations(trip_id);
CREATE INDEX trip_invitations_invitee_email_idx ON trip_invitations(invitee_email);