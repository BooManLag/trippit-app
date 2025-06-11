/*
  # Fix trip sharing by allowing invited users to read trip details

  1. New Policy
    - Allow authenticated users to read trips when they have a pending invitation
    - This enables the invitation modal to load trip details for non-owners

  2. Security
    - Only allows reading trip data, not modifying
    - Only for users who have been explicitly invited
    - Maintains existing owner permissions
*/

-- Add policy to allow invited users to read trip details
CREATE POLICY "Invited users can read trip details"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT trip_id 
      FROM trip_invitations 
      WHERE invitee_email = (
        SELECT email FROM users WHERE id = auth.uid()
      )
      AND status = 'pending'
    )
  );

-- Also allow reading trips that are shared via direct link
-- This is a more permissive policy for shared trips
CREATE POLICY "Allow reading shared trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (true);

-- Drop the more permissive policy and replace with a more secure one
DROP POLICY IF EXISTS "Allow reading shared trips" ON trips;

-- Create a more secure policy that allows reading trips for participants or invited users
CREATE POLICY "Participants and invited users can read trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    -- User is the owner
    user_id = auth.uid() OR
    -- User is a participant
    id IN (
      SELECT trip_id 
      FROM trip_participants 
      WHERE user_id = auth.uid()
    ) OR
    -- User has a pending invitation
    id IN (
      SELECT trip_id 
      FROM trip_invitations 
      WHERE invitee_email = (
        SELECT email FROM users WHERE id = auth.uid()
      )
    )
  );