/*
  # Fix RLS Circular Dependencies

  This migration resolves the infinite recursion error (42P17) in RLS policies by:
  
  1. Helper Functions
     - `is_trip_owner(user_id, trip_id)` - Check if user owns a trip
     - `is_trip_participant(user_id, trip_id)` - Check if user participates in a trip
     - `user_email_from_id(user_id)` - Get user email from ID
  
  2. Policy Updates
     - Rewrite trip_invitations policies to use helper functions
     - Rewrite trips policies to avoid circular references
     - Maintain security while breaking circular dependencies
  
  3. Security
     - All helper functions use SECURITY DEFINER to bypass RLS within functions
     - Policies maintain the same access control logic without circular references
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
        AND ti.invitee_email = user_email_from_id(uid())
        AND ti.status = 'pending'
    )
  );

CREATE POLICY "Trip participants can read trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (is_trip_participant(uid(), id));

-- Recreate trip_participants policies using helper functions
CREATE POLICY "Trip owners can manage participants"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (is_trip_owner(uid(), trip_id))
  WITH CHECK (is_trip_owner(uid(), trip_id));

-- Recreate trip_invitations policies using helper functions
CREATE POLICY "Trip owners can create invitations"
  ON trip_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_id = uid() AND is_trip_owner(uid(), trip_id)
  );

CREATE POLICY "Trip owners can view their trip invitations"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    inviter_id = uid() OR is_trip_owner(uid(), trip_id)
  );

CREATE POLICY "Invitees can respond to their invitations"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (invitee_email = user_email_from_id(uid()))
  WITH CHECK (invitee_email = user_email_from_id(uid()));

CREATE POLICY "Invitees can view their invitations"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (invitee_email = user_email_from_id(uid()));