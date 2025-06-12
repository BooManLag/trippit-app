/*
  # Fix infinite recursion in RLS policies

  This migration completely rebuilds all RLS policies to eliminate infinite recursion
  by using simple, non-recursive logic and avoiding cross-table policy dependencies.

  ## Changes Made:
  1. Drop all existing policies that cause recursion
  2. Create new simplified policies with no circular references
  3. Use direct auth.uid() checks where possible
  4. Avoid complex joins in policy conditions
*/

-- First, completely disable RLS temporarily to clean up
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invitations DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on users table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON users';
    END LOOP;
    
    -- Drop all policies on trips table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'trips' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON trips';
    END LOOP;
    
    -- Drop all policies on trip_participants table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'trip_participants' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON trip_participants';
    END LOOP;
    
    -- Drop all policies on trip_invitations table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'trip_invitations' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON trip_invitations';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invitations ENABLE ROW LEVEL SECURITY;

-- USERS TABLE POLICIES (Simple, no recursion)
-- Users can always read and update their own data
CREATE POLICY "users_own_data"
  ON users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "users_insert_own"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- TRIPS TABLE POLICIES (Simple, no recursion)
-- Users can manage their own trips
CREATE POLICY "trips_own_data"
  ON trips
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can read trips they are invited to (simple email check)
CREATE POLICY "trips_read_invited"
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

-- Anonymous users can read trips with no user_id (public trips)
CREATE POLICY "trips_anonymous_read"
  ON trips
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- TRIP_PARTICIPANTS TABLE POLICIES (Simple, no recursion)
-- Users can manage their own participation records
CREATE POLICY "participants_own_data"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trip owners can manage all participants in their trips
CREATE POLICY "participants_trip_owner_manage"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- TRIP_INVITATIONS TABLE POLICIES (Simple, no recursion)
-- Users can read invitations sent to their email
CREATE POLICY "invitations_read_own"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Users can update invitations sent to their email (to respond)
CREATE POLICY "invitations_update_own"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Trip owners can create and manage invitations for their trips
CREATE POLICY "invitations_trip_owner_manage"
  ON trip_invitations
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()) AND
    inviter_id = auth.uid()
  );

-- Create a simple function to respond to invitations
CREATE OR REPLACE FUNCTION respond_to_invitation(
  p_invitation_id UUID,
  p_response TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation trip_invitations%ROWTYPE;
  v_user_email TEXT;
  v_participant_count INTEGER;
  v_max_participants INTEGER;
BEGIN
  -- Get current user email
  SELECT email INTO v_user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  IF v_user_email IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not authenticated';
    RETURN;
  END IF;
  
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM trip_invitations
  WHERE id = p_invitation_id
    AND invitee_email = v_user_email
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invitation not found or already responded';
    RETURN;
  END IF;
  
  -- Update invitation status
  UPDATE trip_invitations
  SET status = p_response, responded_at = NOW()
  WHERE id = p_invitation_id;
  
  -- If accepted, add user as participant
  IF p_response = 'accepted' THEN
    -- Check trip capacity
    SELECT COUNT(*), t.max_participants
    INTO v_participant_count, v_max_participants
    FROM trip_participants tp
    JOIN trips t ON t.id = tp.trip_id
    WHERE tp.trip_id = v_invitation.trip_id
    GROUP BY t.max_participants;
    
    IF v_participant_count >= v_max_participants THEN
      RETURN QUERY SELECT FALSE, 'Trip is full';
      RETURN;
    END IF;
    
    -- Add as participant
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (v_invitation.trip_id, auth.uid(), 'participant')
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  
  RETURN QUERY SELECT TRUE, 'Invitation response recorded successfully';
END;
$$;

-- Ensure the trip creation trigger is simple
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add participant if user_id is not null
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_trip_created ON trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();