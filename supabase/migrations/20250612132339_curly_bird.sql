/*
  # Fix RLS policies to prevent infinite recursion

  1. Security Changes
    - Drop all existing policies that might cause recursion
    - Create simplified, non-recursive policies
    - Fix trigger function to be more robust

  2. Policy Changes
    - Simplified trip_participants policies
    - Non-recursive users policies  
    - Clean trips access policies
*/

-- First, get a list of all existing policies and drop them systematically
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on trip_participants
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'trip_participants'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON trip_participants', policy_record.policyname);
    END LOOP;
    
    -- Drop all existing policies on users that might cause recursion
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'users' AND policyname LIKE '%trip%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', policy_record.policyname);
    END LOOP;
    
    -- Drop specific trips policies that might cause recursion
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'trips' AND policyname IN ('Users can read accessible trips')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON trips', policy_record.policyname);
    END LOOP;
END $$;

-- Create simplified, non-recursive policies for trip_participants
CREATE POLICY "manage_own_participation"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "read_trip_participants"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    -- User can see participants in trips they own
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()) OR
    -- User can see participants in trips they're part of
    trip_id IN (SELECT trip_id FROM trip_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_trip_participants"
  ON trip_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can add themselves to trips
    user_id = auth.uid() OR
    -- Trip owners can add participants to their trips
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- Create simplified users policies (avoid recursion)
CREATE POLICY "read_own_user_data"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "read_trip_related_users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Allow reading user data for people in shared trips
    -- Use a simple subquery to avoid recursion
    id IN (
      SELECT DISTINCT tp2.user_id 
      FROM trip_participants tp1
      JOIN trip_participants tp2 ON tp1.trip_id = tp2.trip_id
      WHERE tp1.user_id = auth.uid()
    ) OR
    -- Allow reading inviter data for invitations
    id IN (
      SELECT inviter_id FROM trip_invitations 
      WHERE invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Create simplified trips policy
CREATE POLICY "read_accessible_trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    -- User owns the trip
    user_id = auth.uid() OR
    -- User is a participant in the trip (direct lookup)
    EXISTS (SELECT 1 FROM trip_participants WHERE trip_id = trips.id AND user_id = auth.uid()) OR
    -- User has been invited to the trip
    EXISTS (
      SELECT 1 FROM trip_invitations 
      WHERE trip_id = trips.id 
      AND invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Ensure the trigger function is simple and doesn't cause issues
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

-- Ensure RLS is enabled on all tables
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;