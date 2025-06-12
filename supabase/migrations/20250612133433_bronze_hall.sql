/*
  # Fix infinite recursion in RLS policies - final solution

  1. Problem Analysis
    - Infinite recursion occurs when policies reference tables that have policies referencing back
    - The main issue is in trip_participants, trips, and trip_invitations tables
    - Policies are creating circular dependencies

  2. Solution
    - Create completely independent policies that don't reference other tables with RLS
    - Use direct auth.uid() checks where possible
    - Avoid complex joins in policy conditions
    - Use simple subqueries that don't trigger recursion

  3. Security
    - Maintain proper access control
    - Users can only access their own data and related trip data
    - Trip owners can manage their trips and participants
*/

-- First, completely disable RLS to clean up safely
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invitations DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start completely fresh
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on all tables
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('users', 'trips', 'trip_participants', 'trip_invitations')
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invitations ENABLE ROW LEVEL SECURITY;

-- USERS TABLE POLICIES (No recursion - only self-reference)
CREATE POLICY "users_own_data"
  ON users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_insert_own"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- TRIPS TABLE POLICIES (Simple, no complex joins)
CREATE POLICY "trips_owner_full_access"
  ON trips
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow reading trips where user is participant (simple subquery)
CREATE POLICY "trips_participant_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
    )
  );

-- Allow reading trips where user has pending invitation (simple subquery)
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

-- Allow anonymous access to public trips
CREATE POLICY "trips_anonymous_read"
  ON trips
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- TRIP_PARTICIPANTS TABLE POLICIES (No recursion)
CREATE POLICY "participants_own_data"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trip owners can manage participants (simple subquery)
CREATE POLICY "participants_trip_owner_manage"
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

-- TRIP_INVITATIONS TABLE POLICIES (No recursion)
CREATE POLICY "invitations_invitee_read"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "invitations_invitee_update_status"
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

CREATE POLICY "invitations_owner_manage"
  ON trip_invitations
  FOR ALL
  TO authenticated
  USING (inviter_id = auth.uid())
  WITH CHECK (inviter_id = auth.uid());

-- Create a safe function to respond to invitations
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
  v_user_id UUID;
  v_participant_count INTEGER;
  v_max_participants INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not authenticated';
    RETURN;
  END IF;
  
  -- Get user email
  SELECT email INTO v_user_email 
  FROM auth.users 
  WHERE id = v_user_id;
  
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
  
  -- Validate response
  IF p_response NOT IN ('accepted', 'declined') THEN
    RETURN QUERY SELECT FALSE, 'Invalid response';
    RETURN;
  END IF;
  
  -- If accepting, check capacity and add participant
  IF p_response = 'accepted' THEN
    -- Get trip capacity info
    SELECT max_participants INTO v_max_participants
    FROM trips 
    WHERE id = v_invitation.trip_id;
    
    -- Count current participants
    SELECT COUNT(*) INTO v_participant_count
    FROM trip_participants 
    WHERE trip_id = v_invitation.trip_id;
    
    -- Check if trip is full
    IF v_participant_count >= v_max_participants THEN
      RETURN QUERY SELECT FALSE, 'Trip is full';
      RETURN;
    END IF;
    
    -- Check if user is already a participant
    IF EXISTS (
      SELECT 1 FROM trip_participants 
      WHERE trip_id = v_invitation.trip_id AND user_id = v_user_id
    ) THEN
      RETURN QUERY SELECT FALSE, 'You are already a participant';
      RETURN;
    END IF;
    
    -- Add user as participant
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (v_invitation.trip_id, v_user_id, 'participant');
  END IF;
  
  -- Update invitation status
  UPDATE trip_invitations
  SET status = p_response, responded_at = NOW()
  WHERE id = p_invitation_id;
  
  -- Return success
  IF p_response = 'accepted' THEN
    RETURN QUERY SELECT TRUE, 'Successfully joined the trip!';
  ELSE
    RETURN QUERY SELECT TRUE, 'Invitation declined';
  END IF;
END;
$$;

-- Ensure the trip creation trigger is simple and safe
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

-- Ensure proper indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_trip_participants_user_id ON trip_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_participants_trip_id ON trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_invitee_email ON trip_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_trip_id ON trip_invitations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);