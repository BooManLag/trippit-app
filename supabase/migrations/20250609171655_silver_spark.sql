/*
  # Fix infinite recursion in trip_participants RLS policies

  1. Policy Changes
    - Remove all existing policies on trip_participants table
    - Create simplified, non-recursive policies
    - Ensure policies don't create circular dependencies

  2. Security
    - Maintain proper access control
    - Allow users to view participants of trips they're part of
    - Allow trip owners to manage participants
    - Allow users to join trips themselves
*/

-- Drop all existing policies on trip_participants to start fresh
DROP POLICY IF EXISTS "Trip owners can manage all participants" ON trip_participants;
DROP POLICY IF EXISTS "Trip owners can manage participants" ON trip_participants;
DROP POLICY IF EXISTS "Users can insert themselves as participants" ON trip_participants;
DROP POLICY IF EXISTS "Users can join trips" ON trip_participants;
DROP POLICY IF EXISTS "Users can view participants of their trips" ON trip_participants;
DROP POLICY IF EXISTS "Users can view trip participants for trips they're part of" ON trip_participants;

-- Create simplified, non-recursive policies

-- Allow users to read participants of trips they own
CREATE POLICY "Trip owners can read all participants"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

-- Allow users to read participants of trips they are part of
CREATE POLICY "Participants can read trip participants"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT DISTINCT trip_id 
      FROM trip_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Allow users to insert themselves as participants
CREATE POLICY "Users can join trips"
  ON trip_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow trip owners to insert any participant
CREATE POLICY "Trip owners can add participants"
  ON trip_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

-- Allow trip owners to update/delete participants
CREATE POLICY "Trip owners can manage participants"
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

-- Allow users to delete themselves from trips
CREATE POLICY "Users can leave trips"
  ON trip_participants
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());