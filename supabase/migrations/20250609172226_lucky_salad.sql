/*
  # Fix infinite recursion in trip_participants RLS policies

  1. Problem
    - Current RLS policies on trip_participants table are causing infinite recursion
    - The policies are referencing the same table they're protecting, creating circular dependencies

  2. Solution
    - Drop existing problematic policies
    - Create new non-recursive policies that properly check permissions
    - Ensure users can only see participants for trips they're part of
    - Allow trip owners to manage all participants for their trips

  3. Security
    - Users can only read participants for trips they're part of
    - Users can join trips (insert their own participation)
    - Users can leave trips (delete their own participation)
    - Trip owners can manage all participants for their trips
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Participants can read trip participants" ON trip_participants;
DROP POLICY IF EXISTS "Trip owners can add participants" ON trip_participants;
DROP POLICY IF EXISTS "Trip owners can manage participants" ON trip_participants;
DROP POLICY IF EXISTS "Trip owners can read all participants" ON trip_participants;
DROP POLICY IF EXISTS "Users can join trips" ON trip_participants;
DROP POLICY IF EXISTS "Users can leave trips" ON trip_participants;

-- Create new non-recursive policies

-- Allow users to read participants for trips they own
CREATE POLICY "Trip owners can read all participants"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

-- Allow users to read participants for trips they are part of (non-recursive)
CREATE POLICY "Trip members can read participants"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_participants tp
      WHERE tp.trip_id = trip_participants.trip_id
      AND tp.user_id = auth.uid()
    )
  );

-- Allow users to join trips by inserting their own participation
CREATE POLICY "Users can join trips"
  ON trip_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow users to leave trips by deleting their own participation
CREATE POLICY "Users can leave trips"
  ON trip_participants
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Allow trip owners to manage participants for their trips
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