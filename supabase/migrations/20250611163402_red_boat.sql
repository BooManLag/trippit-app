/*
  # Fix infinite recursion in trips RLS policies

  1. Policy Changes
    - Remove circular dependencies in trips table policies
    - Simplify policies to avoid recursive lookups
    - Ensure proper access control without infinite loops

  2. Security
    - Maintain proper access control
    - Users can still access their own trips and trips they're invited to
    - Trip owners maintain full control
*/

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Participants and invited users can read trips" ON trips;
DROP POLICY IF EXISTS "Invited users can read trip details" ON trips;

-- Create simplified policies that don't cause recursion
CREATE POLICY "Trip owners can read their trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (user_id = uid());

CREATE POLICY "Trip participants can read trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tp.trip_id 
      FROM trip_participants tp 
      WHERE tp.user_id = uid()
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
      JOIN users u ON u.id = uid()
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
      AND t.user_id = uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trips t 
      WHERE t.id = trip_id 
      AND t.user_id = uid()
    )
  );