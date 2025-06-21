/*
  # Fix infinite recursion in trip_participants RLS policy

  1. Problem
    - The participants_shared_trip_read policy references trip_participants within its own USING clause
    - This causes infinite recursion when other policies (like user_bucket_progress) query trip_participants
    - PostgreSQL detects this and throws "infinite recursion detected in policy for relation trip_participants"

  2. Solution
    - Remove the self-referencing condition from the policy
    - Keep access to own records and records for trips the user owns
    - This breaks the recursive loop while maintaining necessary access

  3. Security
    - Users can see their own participant records
    - Trip owners can see all participants in their trips
    - No infinite recursion
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "participants_shared_trip_read" ON public.trip_participants;

-- Create a new policy without self-reference
CREATE POLICY "participants_shared_trip_read"
  ON public.trip_participants
  FOR SELECT
  TO authenticated
  USING (
    -- Can see own entries
    user_id = auth.uid()
    OR
    -- Can see all participants in trips where user is the owner
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );