/*
  # Fix RLS circular dependency with helper functions

  1. Security Functions
    - Create helper functions with SECURITY DEFINER to bypass RLS
    - Functions check trip ownership and participation safely
    - Use auth.uid() for Supabase compatibility

  2. Policy Updates
    - Drop problematic policies causing infinite recursion
    - Recreate policies using helper functions
    - Maintain same security model without circular references

  3. Changes
    - Remove circular dependencies between trips, trip_invitations, and trip_participants
    - Use SECURITY DEFINER functions to safely access data
    - Fix 42P17 infinite recursion errors
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Invited users can read trips" ON trips;
DROP POLICY IF EXISTS "Trip participants can read trips" ON trips;
DROP POLICY IF EXISTS "Trip owners can manage participants" ON trip_participants;
DROP POLICY IF EXISTS "Trip owners can create invitations" ON trip_invitations;
DROP POLICY IF EXISTS "Trip owners can view their trip invitations" ON trip_invitations;
DROP POLICY IF EXISTS "Invitees can respond to their invitations" ON trip_invitations;
DROP POLICY IF EXISTS "Invitees can view their invitations" ON trip_invitations;

-- Create helper functions with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION is_trip_owner(p_user_id uuid, p_trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trips 
    WHERE id = p_trip_id AND user_id = p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION is_trip_participant(p_user_id uuid, p_trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM trip_participants 
    WHERE trip_id = p_trip_id AND user_id = p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION user_email_from_id(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email FROM users WHERE id = p_user_id;
  RETURN user_email;
END;
$$;

-- Recreate trips policies without circular dependencies
CREATE POLICY "Invited users can read trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_invitations ti
      WHERE ti.trip_id = trips.id 
        AND ti.invitee_email = user_email_from_id(auth.uid())
        AND ti.status = 'pending'
    )
  );

CREATE POLICY "Trip participants can read trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (is_trip_participant(auth.uid(), id));

-- Recreate trip_participants policies using helper functions
CREATE POLICY "Trip owners can manage participants"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (is_trip_owner(auth.uid(), trip_id))
  WITH CHECK (is_trip_owner(auth.uid(), trip_id));

-- Recreate trip_invitations policies using helper functions
CREATE POLICY "Trip owners can create invitations"
  ON trip_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_id = auth.uid() AND is_trip_owner(auth.uid(), trip_id)
  );

CREATE POLICY "Trip owners can view their trip invitations"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    inviter_id = auth.uid() OR is_trip_owner(auth.uid(), trip_id)
  );

CREATE POLICY "Invitees can respond to their invitations"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (invitee_email = user_email_from_id(auth.uid()))
  WITH CHECK (invitee_email = user_email_from_id(auth.uid()));

CREATE POLICY "Invitees can view their invitations"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (invitee_email = user_email_from_id(auth.uid()));