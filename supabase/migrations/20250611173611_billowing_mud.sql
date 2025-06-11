/*
  # Fix invitation permissions and RLS policies

  1. Security Updates
    - Fix RLS policies for users table to allow reading inviter information
    - Update trip invitation queries to work with proper permissions
    - Ensure proper access control for invitation system

  2. Changes
    - Add policy for reading user display names in invitations
    - Fix the invitation fetching query structure
    - Update policies to prevent permission denied errors
*/

-- Add policy to allow reading user information for invitations
CREATE POLICY "Allow reading user info for invitations"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Allow reading own user info
    id = auth.uid() OR
    -- Allow reading inviter info when user has pending invitation
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
    )
  );

-- Update the invitation response function to handle user creation properly
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
  v_user_display_name text;
BEGIN
  -- Validate response
  IF p_response NOT IN ('accepted', 'declined') THEN
    RETURN QUERY SELECT false, 'Invalid response. Must be "accepted" or "declined"'::text;
    RETURN;
  END IF;

  -- Get current user from auth.users (not our users table)
  SELECT auth.uid() INTO v_user_id;
  SELECT email, COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1)) 
  INTO v_user_email, v_user_display_name
  FROM auth.users 
  WHERE id = v_user_id;
  
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

    -- Ensure user exists in our users table
    INSERT INTO users (id, email, display_name)
    VALUES (v_user_id, v_user_email, v_user_display_name)
    ON CONFLICT (id) DO UPDATE SET
      display_name = COALESCE(users.display_name, v_user_display_name),
      email = v_user_email;

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