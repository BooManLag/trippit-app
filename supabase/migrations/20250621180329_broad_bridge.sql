/*
  # Fix trip participants visibility for shared dare access

  1. Problem
    - Current policies only let users see their own participant rows
    - This breaks dare assignment because INSERT policy can't validate other participants
    - Users need to see all participants in trips they're part of

  2. Solution
    - Update SELECT policy to allow seeing all participants in shared trips
    - Keep other policies restrictive for security
    - This enables dare assignment while maintaining data security

  3. Security
    - Users can only see participants in trips they're actually part of
    - Can't see participants from unrelated trips
    - INSERT/UPDATE/DELETE remain restricted to own entries
*/

-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "participants_trip_context_read" ON public.trip_participants;

-- Create new policy that allows seeing all participants in shared trips
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
    OR
    -- Can see all participants in trips where user is also a participant
    trip_id IN (
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
    )
  );