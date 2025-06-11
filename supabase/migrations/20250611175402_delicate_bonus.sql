/*
  # Fix user table permissions for invitations and participants

  1. Security Updates
    - Update user table policies to allow reading user info for invitations
    - Allow reading participant information for shared trips
    - Ensure proper access control while maintaining security

  2. Changes
    - Drop existing restrictive policies
    - Create comprehensive policies for user data access
    - Allow reading user info when needed for trip functionality
*/

-- Drop existing user policies that are too restrictive
DROP POLICY IF EXISTS "Allow reading user info for invitations" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Auth service can insert users" ON users;

-- Create comprehensive user policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Allow reading user info for trip-related functionality
CREATE POLICY "Allow reading user info for trip functionality"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Always allow reading own data
    id = auth.uid() OR
    -- Allow reading inviter info when user has pending invitation from them
    id IN (
      SELECT inviter_id 
      FROM trip_invitations 
      WHERE invitee_email IN (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    ) OR
    -- Allow reading participant info for trips user is part of
    id IN (
      SELECT tp.user_id
      FROM trip_participants tp
      WHERE tp.trip_id IN (
        SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
      )
    ) OR
    -- Allow reading user info for trips user owns
    id IN (
      SELECT tp.user_id
      FROM trip_participants tp
      JOIN trips t ON tp.trip_id = t.id
      WHERE t.user_id = auth.uid()
    )
  );

-- Update trip policies to be more permissive for shared trips
DROP POLICY IF EXISTS "Users can read own trips" ON trips;

CREATE POLICY "Users can read accessible trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    -- Own trips
    user_id = auth.uid() OR
    -- Trips user is a participant in
    id IN (
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
    ) OR
    -- Trips user has been invited to
    id IN (
      SELECT trip_id FROM trip_invitations 
      WHERE invitee_email IN (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- Ensure trip_participants policies allow proper access
DROP POLICY IF EXISTS "Users can read all participants" ON trip_participants;

CREATE POLICY "Users can read relevant participants"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    -- Own participation records
    user_id = auth.uid() OR
    -- Participants in trips user owns
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    ) OR
    -- Participants in trips user is also a participant in
    trip_id IN (
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
    ) OR
    -- Participants in trips user has been invited to
    trip_id IN (
      SELECT trip_id FROM trip_invitations 
      WHERE invitee_email IN (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );