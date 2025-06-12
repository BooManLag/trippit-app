/*
  # Complete removal of trip_participants functionality

  1. Database Changes
    - Drop all triggers first (before functions they depend on)
    - Drop all functions that reference trip_participants
    - Drop trip_participants and trip_invitations tables
    - Simplify RLS policies for trips and users tables

  2. Security
    - Simplified policies for individual trip ownership only
    - Remove all participant-related access controls
*/

-- Drop triggers FIRST (before the functions they depend on)
DROP TRIGGER IF EXISTS on_trip_created ON trips;

-- Drop all functions that reference trip_participants
DROP FUNCTION IF EXISTS public.add_trip_owner_as_participant();
DROP FUNCTION IF EXISTS public.is_trip_participant(uuid);
DROP FUNCTION IF EXISTS public.join_trip(uuid, uuid);
DROP FUNCTION IF EXISTS public.respond_to_invitation(uuid, text);

-- Drop all policies that reference trip_participants
DROP POLICY IF EXISTS "participants_own_data" ON trip_participants;
DROP POLICY IF EXISTS "participants_trip_owner_manage" ON trip_participants;

-- Drop the trip_participants table completely
DROP TABLE IF EXISTS trip_participants CASCADE;

-- Drop the trip_invitations table as well since it depends on trip_participants
DROP TABLE IF EXISTS trip_invitations CASCADE;

-- Simplify trips table policies to only allow owner access
DROP POLICY IF EXISTS "trips_owner_full_access" ON trips;
DROP POLICY IF EXISTS "trips_participant_read" ON trips;
DROP POLICY IF EXISTS "trips_invited_read" ON trips;
DROP POLICY IF EXISTS "trips_anonymous_read" ON trips;

-- Create simple policies for trips table
CREATE POLICY "trips_owner_full_access"
  ON trips
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow anonymous users to read trips without owners (for public trips)
CREATE POLICY "trips_anonymous_read"
  ON trips
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- Simplify users table policies
DROP POLICY IF EXISTS "users_trip_context_read" ON users;

-- Ensure the basic user policy exists
DROP POLICY IF EXISTS "users_own_data" ON users;
CREATE POLICY "users_own_data"
  ON users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());