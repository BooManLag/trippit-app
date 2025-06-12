/*
  # Fix RLS policies for trips and users tables

  1. Security Updates
    - Fix infinite recursion in trips table policies
    - Update users table policies to allow reading display names for trip participants
    - Ensure proper access control for trip invitations

  2. Changes Made
    - Simplify trips table INSERT policy to prevent recursion
    - Add policy for users table to allow reading display names in trip context
    - Update trip invitation policies for proper access
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "trips_owner_full_access" ON trips;
DROP POLICY IF EXISTS "trips_participant_read" ON trips;
DROP POLICY IF EXISTS "trips_invited_read" ON trips;
DROP POLICY IF EXISTS "trips_anonymous_read" ON trips;

-- Create simplified and safe policies for trips table
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
      SELECT trip_id 
      FROM trip_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "trips_invited_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT trip_id 
      FROM trip_invitations 
      WHERE invitee_email = (
        SELECT email 
        FROM auth.users 
        WHERE id = auth.uid()
      ) 
      AND status = 'pending'
    )
  );

CREATE POLICY "trips_anonymous_read"
  ON trips
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- Update users table policies to allow reading display names for trip context
DROP POLICY IF EXISTS "users_own_data" ON users;

CREATE POLICY "users_own_data"
  ON users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_trip_context_read"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT user_id 
      FROM trip_participants 
      WHERE trip_id IN (
        SELECT trip_id 
        FROM trip_participants 
        WHERE user_id = auth.uid()
      )
    )
    OR
    id IN (
      SELECT inviter_id 
      FROM trip_invitations 
      WHERE invitee_email = (
        SELECT email 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  );

-- Ensure trip_invitations policies are correct
DROP POLICY IF EXISTS "invitations_owner_manage" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_invitee_read" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_invitee_update_status" ON trip_invitations;

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
      SELECT email 
      FROM auth.users 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "invitations_invitee_update_status"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invitee_email = (
      SELECT email 
      FROM auth.users 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    invitee_email = (
      SELECT email 
      FROM auth.users 
      WHERE id = auth.uid()
    )
  );