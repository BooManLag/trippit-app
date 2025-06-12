/*
  # Introduce helper functions to simplify RLS

  1. New helper functions
    - is_trip_participant(trip_id uuid)
    - is_trip_owner(trip_id uuid)
  2. Update policies to use these helpers instead of cross-table queries
*/

-- Function to check if current user is a participant of a trip
CREATE OR REPLACE FUNCTION is_trip_participant(p_trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trip_participants
    WHERE trip_id = p_trip_id
      AND user_id = auth.uid()
  );
END;
$$;

-- Function to check if current user owns a trip
CREATE OR REPLACE FUNCTION is_trip_owner(p_trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trips
    WHERE id = p_trip_id
      AND user_id = auth.uid()
  );
END;
$$;

-- Replace trips_participant_read policy to use helper
DROP POLICY IF EXISTS "trips_participant_read" ON trips;
CREATE POLICY "trips_participant_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    is_trip_participant(id)
  );

-- Replace participants_trip_owner_manage policy to use helper
DROP POLICY IF EXISTS "participants_trip_owner_manage" ON trip_participants;
CREATE POLICY "participants_trip_owner_manage"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (
    is_trip_owner(trip_id)
  )
  WITH CHECK (
    is_trip_owner(trip_id)
  );
