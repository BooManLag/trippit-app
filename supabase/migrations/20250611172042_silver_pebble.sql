/*
  # Fix database policies and functions

  1. Security
    - Drop problematic policies that cause circular dependencies
    - Create proper helper functions with SECURITY DEFINER
    - Recreate policies using helper functions to avoid recursion
    
  2. Functions
    - Fix uid() vs auth.uid() issues
    - Ensure all functions use proper auth.uid() calls
    - Add proper error handling
*/

-- Drop all existing problematic policies first
DROP POLICY IF EXISTS "Trip owners can read their trips" ON trips;
DROP POLICY IF EXISTS "Trip participants can read trips" ON trips;
DROP POLICY IF EXISTS "Invited users can read trips" ON trips;
DROP POLICY IF EXISTS "Trip owners can manage participants" ON trip_participants;
DROP POLICY IF EXISTS "Trip owners can create invitations" ON trip_invitations;
DROP POLICY IF EXISTS "Trip owners can view their trip invitations" ON trip_invitations;
DROP POLICY IF EXISTS "Invitees can respond to their invitations" ON trip_invitations;
DROP POLICY IF EXISTS "Invitees can view their invitations" ON trip_invitations;

-- Drop existing helper functions
DROP FUNCTION IF EXISTS is_trip_owner(uuid, uuid);
DROP FUNCTION IF EXISTS is_trip_participant(uuid, uuid);
DROP FUNCTION IF EXISTS user_email_from_id(uuid);

-- Create improved helper functions with proper error handling
CREATE OR REPLACE FUNCTION is_trip_owner(p_user_id uuid, p_trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF p_user_id IS NULL OR p_trip_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM trips 
    WHERE id = p_trip_id AND user_id = p_user_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION is_trip_participant(p_user_id uuid, p_trip_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  IF p_user_id IS NULL OR p_trip_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM trip_participants 
    WHERE trip_id = p_trip_id AND user_id = p_user_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION user_email_from_id(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_email text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT email INTO user_email FROM users WHERE id = p_user_id;
  RETURN user_email;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Create a function to get current user ID safely
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN auth.uid();
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Recreate trips policies with proper structure
CREATE POLICY "Trip owners can read their trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (user_id = current_user_id());

CREATE POLICY "Trip participants can read trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (is_trip_participant(current_user_id(), id));

CREATE POLICY "Invited users can read trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_invitations ti
      WHERE ti.trip_id = trips.id 
        AND ti.invitee_email = user_email_from_id(current_user_id())
        AND ti.status = 'pending'
    )
  );

-- Recreate trip_participants policies
CREATE POLICY "Trip owners can manage participants"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (is_trip_owner(current_user_id(), trip_id))
  WITH CHECK (is_trip_owner(current_user_id(), trip_id));

-- Recreate trip_invitations policies
CREATE POLICY "Trip owners can create invitations"
  ON trip_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_id = current_user_id() AND is_trip_owner(current_user_id(), trip_id)
  );

CREATE POLICY "Trip owners can view their trip invitations"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    inviter_id = current_user_id() OR is_trip_owner(current_user_id(), trip_id)
  );

CREATE POLICY "Invitees can respond to their invitations"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (invitee_email = user_email_from_id(current_user_id()))
  WITH CHECK (invitee_email = user_email_from_id(current_user_id()));

CREATE POLICY "Invitees can view their invitations"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (invitee_email = user_email_from_id(current_user_id()));

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION is_trip_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_trip_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_email_from_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION current_user_id() TO authenticated;

-- Update the respond_to_invitation function to use proper auth.uid()
CREATE OR REPLACE FUNCTION respond_to_invitation(
  p_invitation_id uuid,
  p_response text
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation_exists boolean;
  v_trip_id uuid;
  v_max_participants integer;
  v_current_participants integer;
  v_user_id uuid;
BEGIN
  -- Validate response
  IF p_response NOT IN ('accepted', 'declined') THEN
    RETURN QUERY SELECT false, 'Invalid response. Must be "accepted" or "declined"'::text;
    RETURN;
  END IF;

  -- Get current user ID
  SELECT current_user_id() INTO v_user_id;
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not authenticated'::text;
    RETURN;
  END IF;

  -- Check if invitation exists and belongs to current user
  SELECT EXISTS(
    SELECT 1 FROM trip_invitations ti
    JOIN users u ON ti.invitee_email = u.email
    WHERE ti.id = p_invitation_id 
    AND u.id = v_user_id
    AND ti.status = 'pending'
  ) INTO v_invitation_exists;
  
  IF NOT v_invitation_exists THEN
    RETURN QUERY SELECT false, 'Invitation not found or already responded to'::text;
    RETURN;
  END IF;

  -- Get trip info
  SELECT trip_id INTO v_trip_id
  FROM trip_invitations 
  WHERE id = p_invitation_id;

  -- If accepting, check if trip still has space
  IF p_response = 'accepted' THEN
    SELECT max_participants INTO v_max_participants 
    FROM trips WHERE id = v_trip_id;
    
    SELECT COUNT(*) INTO v_current_participants 
    FROM trip_participants WHERE trip_id = v_trip_id;

    IF v_current_participants >= v_max_participants THEN
      RETURN QUERY SELECT false, 'Trip is now full'::text;
      RETURN;
    END IF;

    -- Add user as participant
    INSERT INTO trip_participants (trip_id, user_id, role, joined_at)
    VALUES (v_trip_id, v_user_id, 'participant', now())
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;

  -- Update invitation status
  UPDATE trip_invitations 
  SET 
    status = p_response,
    responded_at = now()
  WHERE id = p_invitation_id;

  IF p_response = 'accepted' THEN
    RETURN QUERY SELECT true, 'Invitation accepted! You have joined the trip.'::text;
  ELSE
    RETURN QUERY SELECT true, 'Invitation declined.'::text;
  END IF;
END;
$$;

-- Update the create_trip_invitation function to use proper auth.uid()
CREATE OR REPLACE FUNCTION create_trip_invitation(
  p_trip_id uuid,
  p_invitee_email text
)
RETURNS TABLE(success boolean, message text, invitation_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip_exists boolean;
  v_is_trip_owner boolean;
  v_max_participants integer;
  v_current_participants integer;
  v_pending_invitations integer;
  v_invitation_id uuid;
  v_invitee_already_participant boolean;
  v_user_id uuid;
BEGIN
  -- Get current user ID
  SELECT current_user_id() INTO v_user_id;
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not authenticated'::text, null::uuid;
    RETURN;
  END IF;

  -- Check if trip exists
  SELECT EXISTS(SELECT 1 FROM trips WHERE id = p_trip_id) INTO v_trip_exists;
  
  IF NOT v_trip_exists THEN
    RETURN QUERY SELECT false, 'Trip not found'::text, null::uuid;
    RETURN;
  END IF;

  -- Check if user is the trip owner
  SELECT is_trip_owner(v_user_id, p_trip_id) INTO v_is_trip_owner;
  
  IF NOT v_is_trip_owner THEN
    RETURN QUERY SELECT false, 'Only trip owners can send invitations'::text, null::uuid;
    RETURN;
  END IF;

  -- Check if invitee is already a participant
  SELECT EXISTS(
    SELECT 1 FROM trip_participants tp
    JOIN users u ON tp.user_id = u.id
    WHERE tp.trip_id = p_trip_id AND u.email = p_invitee_email
  ) INTO v_invitee_already_participant;
  
  IF v_invitee_already_participant THEN
    RETURN QUERY SELECT false, 'User is already a participant in this trip'::text, null::uuid;
    RETURN;
  END IF;

  -- Get trip capacity info
  SELECT max_participants INTO v_max_participants 
  FROM trips WHERE id = p_trip_id;
  
  SELECT COUNT(*) INTO v_current_participants 
  FROM trip_participants WHERE trip_id = p_trip_id;

  SELECT COUNT(*) INTO v_pending_invitations
  FROM trip_invitations 
  WHERE trip_id = p_trip_id AND status = 'pending';

  -- Check if trip would be full with pending invitations
  IF (v_current_participants + v_pending_invitations) >= v_max_participants THEN
    RETURN QUERY SELECT false, 'Trip is full or would be full with pending invitations'::text, null::uuid;
    RETURN;
  END IF;

  -- Create invitation (will update if already exists due to UNIQUE constraint)
  INSERT INTO trip_invitations (trip_id, inviter_id, invitee_email)
  VALUES (p_trip_id, v_user_id, p_invitee_email)
  ON CONFLICT (trip_id, invitee_email) 
  DO UPDATE SET 
    status = 'pending',
    created_at = now(),
    responded_at = null
  RETURNING id INTO v_invitation_id;

  RETURN QUERY SELECT true, 'Invitation sent successfully!'::text, v_invitation_id;
END;
$$;