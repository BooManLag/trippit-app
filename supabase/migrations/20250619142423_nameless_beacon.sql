/*
  # Fix invitation system to properly handle email invitations

  1. Database Changes
    - Simplify trip_invitations policies to prevent confusion
    - Ensure proper email handling in invitation functions
    - Fix RLS policies that might be causing email mixups

  2. Security
    - Clear separation between inviter and invitee
    - Proper email validation and handling
    - Simplified policies to prevent circular references
*/

-- Drop all existing problematic policies for trip_invitations
DROP POLICY IF EXISTS "invitations_owner_create" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_owner_read" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_invitee_access" ON trip_invitations;
DROP POLICY IF EXISTS "invitee_sees_own_invites" ON trip_invitations;
DROP POLICY IF EXISTS "trip_owner_sees_invites" ON trip_invitations;
DROP POLICY IF EXISTS "insert invitations" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_owner_manage" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_invitee_read" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_invitee_update" ON trip_invitations;
DROP POLICY IF EXISTS "update invitations" ON trip_invitations;

-- Create simple, clear policies for trip_invitations

-- 1. Trip owners can create and manage invitations for their trips
CREATE POLICY "invitations_owner_create"
  ON trip_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_id = auth.uid() AND
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- 2. Trip owners can read invitations for their trips
CREATE POLICY "invitations_owner_read"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- 3. Invitees can read invitations sent to their email
CREATE POLICY "invitee_sees_own_invites"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 4. Invitees can update their own invitation status
CREATE POLICY "update invitations"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Fix the accept_invitation function to be more robust
CREATE OR REPLACE FUNCTION accept_invitation(p_token text)
RETURNS TABLE(success boolean, message text, trip_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation trip_invitations%ROWTYPE;
  v_user_id uuid;
  v_user_email text;
  v_trip trips%ROWTYPE;
  v_participant_count integer;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not authenticated', null::uuid;
    RETURN;
  END IF;

  -- Get user email from auth.users
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  IF v_user_email IS NULL THEN
    RETURN QUERY SELECT false, 'User email not found', null::uuid;
    RETURN;
  END IF;
  
  -- Get invitation by token
  SELECT * INTO v_invitation 
  FROM trip_invitations 
  WHERE token = p_token;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invitation not found', null::uuid;
    RETURN;
  END IF;
  
  -- Check invitation status
  IF v_invitation.status != 'pending' THEN
    RETURN QUERY SELECT false, 'Invitation has already been responded to', null::uuid;
    RETURN;
  END IF;
  
  -- Verify the invitation is for this user's email (case-insensitive)
  IF LOWER(v_invitation.invitee_email) != LOWER(v_user_email) THEN
    RETURN QUERY SELECT false, 'This invitation is not for your email address', null::uuid;
    RETURN;
  END IF;
  
  -- Get trip details
  SELECT * INTO v_trip FROM trips WHERE id = v_invitation.trip_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Trip not found', null::uuid;
    RETURN;
  END IF;
  
  -- Check if trip is full using the participant_ids array
  v_participant_count := array_length(v_trip.participant_ids, 1);
  IF v_participant_count IS NULL THEN
    v_participant_count := 0;
  END IF;
  
  IF v_participant_count >= v_trip.max_participants THEN
    RETURN QUERY SELECT false, 'Trip is full', null::uuid;
    RETURN;
  END IF;
  
  -- Check if user is already a participant using the array
  IF v_user_id = ANY(v_trip.participant_ids) THEN
    -- Update invitation status anyway
    UPDATE trip_invitations 
    SET status = 'accepted', responded_at = now()
    WHERE id = v_invitation.id;
    
    RETURN QUERY SELECT true, 'You are already a participant in this trip', v_invitation.trip_id;
    RETURN;
  END IF;
  
  -- Add user as participant (trigger will update participant_ids array)
  INSERT INTO trip_participants (trip_id, user_id, role)
  VALUES (v_invitation.trip_id, v_user_id, 'participant')
  ON CONFLICT (trip_id, user_id) DO NOTHING;
  
  -- Update invitation status
  UPDATE trip_invitations 
  SET status = 'accepted', responded_at = now()
  WHERE id = v_invitation.id;
  
  RETURN QUERY SELECT true, 'Successfully joined the trip!', v_invitation.trip_id;
END;
$$;

-- Add some debugging to help track invitation issues
-- Create a function to check invitation details (for debugging)
CREATE OR REPLACE FUNCTION debug_invitation(p_token text)
RETURNS TABLE(
  invitation_id uuid,
  trip_id uuid,
  inviter_email text,
  invitee_email text,
  current_user_email text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email text;
BEGIN
  -- Get current user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  
  RETURN QUERY
  SELECT 
    ti.id,
    ti.trip_id,
    u.email as inviter_email,
    ti.invitee_email,
    v_user_email as current_user_email,
    ti.status
  FROM trip_invitations ti
  JOIN users u ON u.id = ti.inviter_id
  WHERE ti.token = p_token;
END;
$$;