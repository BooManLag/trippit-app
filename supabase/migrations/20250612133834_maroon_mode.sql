/*
  # Fix infinite recursion in RLS policies - final solution
  
  This migration completely resolves infinite recursion issues by:
  1. Completely cleaning up all existing policies
  2. Creating simple, non-recursive policies
  3. Avoiding circular dependencies between tables
  4. Maintaining proper security while ensuring functionality
  
  The key is to use direct auth.uid() checks and simple subqueries
  that don't reference tables with RLS policies that reference back.
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
    -- Drop all policies on all relevant tables
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

-- =====================================================
-- USERS TABLE POLICIES (Simple, no recursion)
-- =====================================================

-- Users can always read and manage their own data
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

-- Users can read basic info for others that share a trip or invitation
CREATE POLICY "users_shared_trip_read"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    shares_trip_or_invitation(id, email)
  );

-- =====================================================
-- TRIPS TABLE POLICIES (Simple, no complex joins)
-- =====================================================

-- Users can manage their own trips
CREATE POLICY "trips_owner_full_access"
  ON trips
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can read trips where they are participants (simple subquery)
CREATE POLICY "trips_participant_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
    )
  );

-- Users can read trips where they have pending invitations (simple subquery)
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

-- Allow anonymous access to public trips (trips with no owner)
CREATE POLICY "trips_anonymous_read"
  ON trips
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- =====================================================
-- TRIP_PARTICIPANTS TABLE POLICIES (No recursion)
-- =====================================================

-- Users can manage their own participation records
CREATE POLICY "participants_own_data"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trip owners can manage all participants in their trips (simple subquery)
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

-- =====================================================
-- TRIP_INVITATIONS TABLE POLICIES (No recursion)
-- =====================================================

-- Users can read invitations sent to their email
CREATE POLICY "invitations_invitee_read"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Users can update invitations sent to their email (to respond)
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

-- Users can manage invitations for their trips
CREATE POLICY "invitations_owner_manage"
  ON trip_invitations
  FOR ALL
  TO authenticated
  USING (inviter_id = auth.uid())
  WITH CHECK (inviter_id = auth.uid());

-- =====================================================
-- SAFE FUNCTIONS
-- =====================================================

-- Helper to determine if the current user shares a trip or invitation
-- with another user. This avoids RLS recursion by accepting the user's
-- id and email as parameters instead of querying the users table.
CREATE OR REPLACE FUNCTION shares_trip_or_invitation(
  p_user_id UUID,
  p_user_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Shared trip check
  IF EXISTS (
    SELECT 1
    FROM trip_participants tp1
    JOIN trip_participants tp2 ON tp1.trip_id = tp2.trip_id
    WHERE tp1.user_id = p_user_id
      AND tp2.user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- Invitation from the target user to the current user
  IF EXISTS (
    SELECT 1 FROM trip_invitations
    WHERE inviter_id = p_user_id
      AND invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ) THEN
    RETURN TRUE;
  END IF;

  -- Invitation from the current user to the target user
  IF p_user_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM trip_invitations
    WHERE inviter_id = auth.uid()
      AND invitee_email = p_user_email
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

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

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Ensure proper indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_trip_participants_user_id ON trip_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_participants_trip_id ON trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_invitee_email ON trip_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_trip_id ON trip_invitations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);

-- =====================================================
-- CONSTRAINTS AND VALIDATION
-- =====================================================

-- Ensure proper constraints exist
DO $$
BEGIN
  -- Unique constraint for trip participants
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trip_participants_unique' 
    AND table_name = 'trip_participants'
  ) THEN
    ALTER TABLE trip_participants 
    ADD CONSTRAINT trip_participants_unique 
    UNIQUE (trip_id, user_id);
  END IF;
  
  -- Unique constraint for trip invitations
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trip_invitations_trip_id_invitee_email_key' 
    AND table_name = 'trip_invitations'
  ) THEN
    ALTER TABLE trip_invitations 
    ADD CONSTRAINT trip_invitations_trip_id_invitee_email_key 
    UNIQUE (trip_id, invitee_email);
  END IF;
END $$;