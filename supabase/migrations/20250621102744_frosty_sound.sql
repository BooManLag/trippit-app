/*
  # Fix RLS infinite recursion by replacing circular policies

  1. Problem
    - Existing RLS policies on trips, trip_participants, and trip_invitations tables
      contain circular references causing infinite recursion
    - This results in 500 errors when querying these tables

  2. Solution
    - Drop ALL existing policies on these tables to ensure clean slate
    - Create new, non-recursive policies that avoid circular references
    - Use simple EXISTS subqueries instead of complex joins

  3. Changes
    - Remove all existing policies from trips, trip_participants, trip_invitations, users tables
    - Create simplified policies that don't reference the same table recursively
    - Ensure proper access control while avoiding infinite loops
*/

-- 1) DROP ALL existing policies to ensure clean slate

-- Drop ALL policies on trips table
DO $$ 
DECLARE 
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'trips' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trips', policy_name);
    END LOOP;
END $$;

-- Drop ALL policies on trip_participants table
DO $$ 
DECLARE 
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'trip_participants' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trip_participants', policy_name);
    END LOOP;
END $$;

-- Drop ALL policies on trip_invitations table
DO $$ 
DECLARE 
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'trip_invitations' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trip_invitations', policy_name);
    END LOOP;
END $$;

-- Drop ALL policies on users table
DO $$ 
DECLARE 
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', policy_name);
    END LOOP;
END $$;

-- 2) Create new, non-recursive policies

-- USERS table policies
CREATE POLICY "users_own_data"
  ON public.users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_basic_read_for_invitations"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- TRIPS table policies
CREATE POLICY "trips_owner_access"
  ON public.trips
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trips_participant_read"
  ON public.trips
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    auth.uid() = ANY(participant_ids)
  );

CREATE POLICY "trips_anonymous_read"
  ON public.trips
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- TRIP_PARTICIPANTS table policies
CREATE POLICY "participants_own_entries"
  ON public.trip_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "participants_trip_context_read"
  ON public.trip_participants
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

-- TRIP_INVITATIONS table policies
CREATE POLICY "invitations_invitee_access"
  ON public.trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email = (auth.jwt() ->> 'email')::text
  );

CREATE POLICY "invitations_invitee_update"
  ON public.trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invitee_email = (auth.jwt() ->> 'email')::text
  )
  WITH CHECK (
    invitee_email = (auth.jwt() ->> 'email')::text
  );

CREATE POLICY "invitations_owner_manage"
  ON public.trip_invitations
  FOR ALL
  TO authenticated
  USING (
    inviter_id = auth.uid()
  )
  WITH CHECK (
    inviter_id = auth.uid()
  );

-- 3) Ensure RLS is enabled on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_invitations ENABLE ROW LEVEL SECURITY;

-- 4) Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_invitations TO authenticated;

GRANT SELECT ON public.trips TO anon;