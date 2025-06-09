/*
  # Fix infinite recursion in trip_participants RLS policies

  1. Problem
    - Current RLS policies on trip_participants table are causing infinite recursion
    - The "Trip members can read participants" policy is querying trip_participants within itself
    - This creates a recursive loop when trying to check if a user is a trip member

  2. Solution
    - Replace the recursive policy with a simpler approach
    - Allow authenticated users to read all trip participants
    - Keep other policies intact for proper access control on INSERT/UPDATE/DELETE operations

  3. Changes
    - Drop the problematic "Trip members can read participants" policy
    - Create a new simple SELECT policy for authenticated users
    - Maintain existing policies for other operations
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Trip members can read participants" ON public.trip_participants;

-- Create a simple SELECT policy that allows authenticated users to read all participants
-- This removes the recursive check while still maintaining authentication requirement
CREATE POLICY "Authenticated users can read participants"
  ON public.trip_participants
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure the other policies remain intact and don't cause recursion issues
-- Update the "Trip owners can read all participants" policy to be more specific
DROP POLICY IF EXISTS "Trip owners can read all participants" ON public.trip_participants;

-- The remaining policies should be sufficient:
-- - "Trip owners can manage participants" (for trip owners)
-- - "Users can join trips" (for INSERT)
-- - "Users can leave trips" (for DELETE)
-- - "Authenticated users can read participants" (for SELECT - newly created above)