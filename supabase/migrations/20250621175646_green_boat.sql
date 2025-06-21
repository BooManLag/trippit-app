/*
  # Allow trip members to share dare access

  1. Security Changes
    - Allow all trip members (owner or participant) to see dares
    - Allow assigning dares to any user belonging to the same trip
    - Allow any trip member to mark a dare complete
    - Keep deletion restricted to the original owner

  2. Policies
    - SELECT: trip members can see all dares for their trips
    - INSERT: trip members can assign dares to other trip members
    - UPDATE: trip members can mark any dare complete
    - DELETE: only dare owner can delete their dares
*/

-- Remove legacy progress policy
DROP POLICY IF EXISTS "user_bucket_progress_access" ON public.user_bucket_progress;

-- SELECT: allow all trip members (owner or participant) to see dares
CREATE POLICY "user_bucket_progress_select"
  ON public.user_bucket_progress
  FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
    )
  );

-- INSERT: allow assigning dares to any user belonging to the same trip
CREATE POLICY "user_bucket_progress_insert"
  ON public.user_bucket_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
    )
    AND (
      user_id = (SELECT user_id FROM trips WHERE id = trip_id)
      OR EXISTS (
        SELECT 1 FROM trip_participants tp
        WHERE tp.trip_id = trip_id
        AND tp.user_id = user_id
      )
    )
  );

-- UPDATE: allow any trip member to mark a dare complete
CREATE POLICY "user_bucket_progress_update"
  ON public.user_bucket_progress
  FOR UPDATE
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
    )
  );

-- DELETE: keep deletion restricted to the original owner
CREATE POLICY "user_bucket_progress_delete"
  ON public.user_bucket_progress
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);