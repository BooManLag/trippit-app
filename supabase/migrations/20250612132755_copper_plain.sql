/*
  # Fix infinite recursion in RLS policies

  This migration fixes the infinite recursion issues in the RLS policies for:
  1. `trips` table - removes circular reference in trip owner policies
  2. `trip_invitations` table - simplifies policies to avoid recursive lookups
  3. `trip_participants` table - ensures clean policy structure

  ## Changes Made
  1. Drop existing problematic policies
  2. Recreate policies with proper non-recursive conditions
  3. Ensure policies use direct user ID comparisons where possible
  4. Avoid complex subqueries that reference the same table
*/

-- Drop existing problematic policies for trips table
DROP POLICY IF EXISTS "trips_own_data" ON trips;
DROP POLICY IF EXISTS "trips_read_invited" ON trips;

-- Drop existing problematic policies for trip_invitations table  
DROP POLICY IF EXISTS "invitations_read_own" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_trip_owner_manage" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_update_own" ON trip_invitations;

-- Drop existing problematic policies for trip_participants table
DROP POLICY IF EXISTS "participants_trip_owner_manage" ON trip_participants;

-- Recreate trips policies without recursion
CREATE POLICY "trips_owner_full_access"
  ON trips
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trips_participant_read"
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

CREATE POLICY "trips_invited_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT ti.trip_id
      FROM trip_invitations ti
      WHERE ti.invitee_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      ) AND ti.status = 'pending'
    )
  );

-- Recreate trip_invitations policies without recursion
CREATE POLICY "invitations_owner_manage"
  ON trip_invitations
  FOR ALL
  TO authenticated
  USING (inviter_id = auth.uid())
  WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "invitations_invitee_read_update"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "invitations_invitee_update_status"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Recreate trip_participants policies without recursion
CREATE POLICY "participants_own_data"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "participants_trip_owner_manage"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (
      SELECT t.id FROM trips t WHERE t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT t.id FROM trips t WHERE t.user_id = auth.uid()
    )
  );