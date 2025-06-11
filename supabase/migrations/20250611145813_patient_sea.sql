/*
  # Update existing trip policies to work with invitation system

  1. Policy Updates
    - Remove the old restrictive policy
    - Ensure the new comprehensive policy covers all cases
    - Maintain security while enabling sharing

  2. Security
    - Owners can do everything with their trips
    - Participants can read trips they're part of
    - Invited users can read trip details to make decisions
    - Anonymous users can still create trips
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can CRUD own trips" ON trips;

-- Create separate policies for different operations
CREATE POLICY "Trip owners can manage their trips"
  ON trips
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- The "Participants and invited users can read trips" policy from the previous migration
-- already handles read access for participants and invited users

-- Keep the anonymous policies for trip creation
-- These should already exist from previous migrations:
-- "Allow anonymous trip creation" and "Allow anonymous trip reading"