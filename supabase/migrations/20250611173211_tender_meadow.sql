/*
  # Fix RLS Policy Conflicts

  This migration resolves the 406 errors by:
  1. Dropping problematic policies that cause circular dependencies
  2. Creating simplified, non-recursive policies
  3. Using direct column references instead of function calls where possible
  4. Ensuring proper policy hierarchy

  ## Changes
  - Simplified trip access policies
  - Fixed invitation policies
  - Removed circular dependencies
  - Added proper error handling
*/

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Trip owners can read their trips" ON trips;
DROP POLICY IF EXISTS "Trip participants can read trips" ON trips;
DROP POLICY IF EXISTS "Invited users can read trips" ON trips;
DROP POLICY IF EXISTS "Trip owners can manage their trips" ON trips;
DROP POLICY IF EXISTS "Allow anonymous trip reading" ON trips;
DROP POLICY IF EXISTS "Allow anonymous trip creation" ON trips;

-- Drop trip_participants policies
DROP POLICY IF EXISTS "Trip owners can manage participants" ON trip_participants;
DROP POLICY IF EXISTS "Users can join trips" ON trip_participants;
DROP POLICY IF EXISTS "Users can leave trips" ON trip_participants;
DROP POLICY IF EXISTS "Authenticated users can read participants" ON trip_participants;

-- Drop trip_invitations policies
DROP POLICY IF EXISTS "Trip owners can create invitations" ON trip_invitations;
DROP POLICY IF EXISTS "Trip owners can view their trip invitations" ON trip_invitations;
DROP POLICY IF EXISTS "Invitees can respond to their invitations" ON trip_invitations;
DROP POLICY IF EXISTS "Invitees can view their invitations" ON trip_invitations;

-- Create simplified trips policies without circular dependencies
CREATE POLICY "Users can read own trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own trips"
  ON trips
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow anonymous trip creation (for guest users)
CREATE POLICY "Allow anonymous trip creation"
  ON trips
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Allow anonymous trip reading"
  ON trips
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- Create simplified trip_participants policies
CREATE POLICY "Users can read all participants"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own participation"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create simplified trip_invitations policies
CREATE POLICY "Users can create invitations for their trips"
  ON trip_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "Users can read invitations they sent"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (inviter_id = auth.uid());

CREATE POLICY "Users can read invitations sent to them"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can respond to their invitations"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invitee_email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    invitee_email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Update helper functions to be more robust
CREATE OR REPLACE FUNCTION is_trip_owner(p_user_id uuid, p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trips 
    WHERE id = p_trip_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION is_trip_participant(p_user_id uuid, p_trip_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_participants 
    WHERE trip_id = p_trip_id AND user_id = p_user_id
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_trip_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_trip_participant(uuid, uuid) TO authenticated;

-- Update the respond_to_invitation function to work with new policies
CREATE OR REPLACE FUNCTION respond_to_invitation(
  p_invitation_id uuid,
  p_response text
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation record;
  v_max_participants integer;
  v_current_participants integer;
  v_user_id uuid;
  v_user_email text;
BEGIN
  -- Validate response
  IF p_response NOT IN ('accepted', 'declined') THEN
    RETURN QUERY SELECT false, 'Invalid response. Must be "accepted" or "declined"'::text;
    RETURN;
  END IF;

  -- Get current user
  SELECT auth.uid() INTO v_user_id;
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  IF v_user_id IS NULL OR v_user_email IS NULL THEN
    RETURN QUERY SELECT false, 'User not authenticated'::text;
    RETURN;
  END IF;

  -- Get invitation details
  SELECT * INTO v_invitation
  FROM trip_invitations
  WHERE id = p_invitation_id 
    AND invitee_email = v_user_email
    AND status = 'pending';
  
  IF v_invitation IS NULL THEN
    RETURN QUERY SELECT false, 'Invitation not found or already responded to'::text;
    RETURN;
  END IF;

  -- If accepting, check if trip still has space
  IF p_response = 'accepted' THEN
    SELECT max_participants INTO v_max_participants 
    FROM trips WHERE id = v_invitation.trip_id;
    
    SELECT COUNT(*) INTO v_current_participants 
    FROM trip_participants WHERE trip_id = v_invitation.trip_id;

    IF v_current_participants >= v_max_participants THEN
      RETURN QUERY SELECT false, 'Trip is now full'::text;
      RETURN;
    END IF;

    -- Ensure user exists in users table
    INSERT INTO users (id, email, display_name)
    VALUES (v_user_id, v_user_email, split_part(v_user_email, '@', 1))
    ON CONFLICT (id) DO NOTHING;

    -- Add user as participant
    INSERT INTO trip_participants (trip_id, user_id, role, joined_at)
    VALUES (v_invitation.trip_id, v_user_id, 'participant', now())
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

-- Update create_trip_invitation function
CREATE OR REPLACE FUNCTION create_trip_invitation(
  p_trip_id uuid,
  p_invitee_email text
)
RETURNS TABLE(success boolean, message text, invitation_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip record;
  v_current_participants integer;
  v_pending_invitations integer;
  v_invitation_id uuid;
  v_user_id uuid;
BEGIN
  -- Get current user
  SELECT auth.uid() INTO v_user_id;
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not authenticated'::text, null::uuid;
    RETURN;
  END IF;

  -- Get trip details and verify ownership
  SELECT * INTO v_trip FROM trips WHERE id = p_trip_id AND user_id = v_user_id;
  
  IF v_trip IS NULL THEN
    RETURN QUERY SELECT false, 'Trip not found or you are not the owner'::text, null::uuid;
    RETURN;
  END IF;

  -- Check if invitee is already a participant
  IF EXISTS(
    SELECT 1 FROM trip_participants tp
    JOIN auth.users u ON tp.user_id = u.id
    WHERE tp.trip_id = p_trip_id AND u.email = p_invitee_email
  ) THEN
    RETURN QUERY SELECT false, 'User is already a participant in this trip'::text, null::uuid;
    RETURN;
  END IF;

  -- Get current counts
  SELECT COUNT(*) INTO v_current_participants 
  FROM trip_participants WHERE trip_id = p_trip_id;

  SELECT COUNT(*) INTO v_pending_invitations
  FROM trip_invitations 
  WHERE trip_id = p_trip_id AND status = 'pending';

  -- Check capacity
  IF (v_current_participants + v_pending_invitations) >= v_trip.max_participants THEN
    RETURN QUERY SELECT false, 'Trip is full or would be full with pending invitations'::text, null::uuid;
    RETURN;
  END IF;

  -- Create invitation
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