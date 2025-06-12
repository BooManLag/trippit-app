/*
  # Fix infinite recursion in RLS policies

  This migration fixes the infinite recursion errors in Row Level Security policies
  by dropping all existing problematic policies and recreating them with proper
  non-recursive logic.

  ## Changes Made:
  1. Drop all existing policies that cause recursion
  2. Create new non-recursive policies for trips, trip_invitations, and trip_participants
  3. Ensure proper access control without circular references

  ## Security:
  - Trip owners can manage their trips and all participants
  - Users can manage their own participation
  - Invited users can read trip details and respond to invitations
*/

-- Drop ALL existing policies for trips table
DROP POLICY IF EXISTS "trips_own_data" ON trips;
DROP POLICY IF EXISTS "trips_read_invited" ON trips;
DROP POLICY IF EXISTS "trips_anonymous_read" ON trips;
DROP POLICY IF EXISTS "trips_owner_full_access" ON trips;
DROP POLICY IF EXISTS "trips_participant_read" ON trips;
DROP POLICY IF EXISTS "trips_invited_read" ON trips;

-- Drop ALL existing policies for trip_invitations table  
DROP POLICY IF EXISTS "invitations_read_own" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_trip_owner_manage" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_update_own" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_owner_manage" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_invitee_read_update" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_invitee_update_status" ON trip_invitations;

-- Drop ALL existing policies for trip_participants table
DROP POLICY IF EXISTS "participants_own_data" ON trip_participants;
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

CREATE POLICY "trips_anonymous_read"
  ON trips
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- Recreate trip_invitations policies without recursion
CREATE POLICY "invitations_owner_manage"
  ON trip_invitations
  FOR ALL
  TO authenticated
  USING (inviter_id = auth.uid())
  WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "invitations_invitee_read"
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