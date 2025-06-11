/*
  # Fix RLS infinite recursion in trips policies

  1. Problem
    - The existing RLS policies on trips table create infinite recursion
    - Policies reference trip_participants and trip_invitations which reference back to trips
    - This causes "infinite recursion detected in policy for relation trips" error

  2. Solution
    - Drop the problematic combined policies
    - Create separate, simpler policies for each access pattern
    - Use auth.uid() instead of uid() for Supabase compatibility
    - Avoid circular dependencies between table policies

  3. Security
    - Trip owners can read their own trips
    - Trip participants can read trips they're part of
    - Invited users can read trips they're invited to
    - Trip owners can manage participants
*/

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Participants and invited users can read trips" ON trips;
DROP POLICY IF EXISTS "Invited users can read trip details" ON trips;

-- Create simplified policies that don't cause recursion
CREATE POLICY "Trip owners can read their trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Trip participants can read trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tp.trip_id 
      FROM trip_participants tp 
      WHERE tp.user_id = auth.uid()
    )
  );

CREATE POLICY "Invited users can read trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT ti.trip_id 
      FROM trip_invitations ti 
      JOIN users u ON u.id = auth.uid()
      WHERE ti.invitee_email = u.email 
      AND ti.status = 'pending'
    )
  );

-- Ensure the trip_participants policies don't cause recursion
DROP POLICY IF EXISTS "Trip owners can manage participants" ON trip_participants;

CREATE POLICY "Trip owners can manage participants"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trips t 
      WHERE t.id = trip_id 
      AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips t 
      WHERE t.id = trip_id 
      AND t.user_id = auth.uid()
    )
  );