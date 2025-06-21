/*
  # Fix invitation display and ownership issues

  1. Problem Analysis
    - Invitations showing "Unknown" and "Invalid Date" 
    - Wrong ownership display after accepting invitations
    - Data enrichment issues in invitation service

  2. Changes Made
    - Fix the getPendingInvitations function to properly enrich data
    - Ensure trip ownership is correctly maintained
    - Add better error handling and data validation
    - Fix date formatting issues

  3. Security
    - Maintain existing RLS policies
    - Ensure proper data access controls
*/

-- Create a comprehensive function to get pending invitations with all required data
CREATE OR REPLACE FUNCTION get_pending_invitations_for_user()
RETURNS TABLE(
  invitation_id uuid,
  trip_id uuid,
  inviter_id uuid,
  invitee_email text,
  token text,
  status text,
  created_at timestamptz,
  responded_at timestamptz,
  trip_destination text,
  trip_start_date date,
  trip_end_date date,
  trip_max_participants integer,
  inviter_email text,
  inviter_display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email text;
BEGIN
  -- Get current user's email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  IF v_user_email IS NULL THEN
    RETURN;
  END IF;
  
  -- Return enriched invitation data with all required fields
  RETURN QUERY
  SELECT 
    ti.id as invitation_id,
    ti.trip_id,
    ti.inviter_id,
    ti.invitee_email,
    ti.token,
    ti.status,
    ti.created_at,
    ti.responded_at,
    t.destination as trip_destination,
    t.start_date as trip_start_date,
    t.end_date as trip_end_date,
    t.max_participants as trip_max_participants,
    u.email as inviter_email,
    u.display_name as inviter_display_name
  FROM trip_invitations ti
  JOIN trips t ON t.id = ti.trip_id
  JOIN users u ON u.id = ti.inviter_id
  WHERE ti.invitee_email = v_user_email
    AND ti.status = 'pending'
  ORDER BY ti.created_at DESC;
END;
$$;

-- Create a function to get trip participants with proper user data
CREATE OR REPLACE FUNCTION get_trip_participants_with_users(p_trip_id uuid)
RETURNS TABLE(
  participant_id uuid,
  user_id uuid,
  role text,
  joined_at timestamptz,
  user_email text,
  user_display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.id as participant_id,
    tp.user_id,
    tp.role,
    tp.joined_at,
    u.email as user_email,
    u.display_name as user_display_name
  FROM trip_participants tp
  JOIN users u ON u.id = tp.user_id
  WHERE tp.trip_id = p_trip_id
  ORDER BY tp.joined_at ASC;
END;
$$;

-- Create a function to get trip details with participant info
CREATE OR REPLACE FUNCTION get_trip_with_participants(p_trip_id uuid)
RETURNS TABLE(
  trip_id uuid,
  destination text,
  start_date date,
  end_date date,
  max_participants integer,
  user_id uuid,
  participant_ids uuid[],
  created_at timestamptz,
  owner_email text,
  owner_display_name text,
  participant_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as trip_id,
    t.destination,
    t.start_date,
    t.end_date,
    t.max_participants,
    t.user_id,
    t.participant_ids,
    t.created_at,
    u.email as owner_email,
    u.display_name as owner_display_name,
    array_length(t.participant_ids, 1) as participant_count
  FROM trips t
  LEFT JOIN users u ON u.id = t.user_id
  WHERE t.id = p_trip_id;
END;
$$;

-- Fix the accept_invitation function to ensure proper data consistency
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS TABLE(
  success boolean,
  message text,
  joined_trip_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation_record RECORD;
  v_user_email text;
  v_user_id uuid;
  v_trip_record RECORD;
  v_participant_count integer;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();
  
  SELECT email INTO v_user_email 
  FROM auth.users 
  WHERE id = v_user_id;
  
  IF v_user_email IS NULL OR v_user_id IS NULL THEN
    RETURN QUERY VALUES (false, 'User not authenticated', NULL::uuid);
    RETURN;
  END IF;

  -- Get invitation details
  SELECT 
    ti.id,
    ti.trip_id,
    ti.inviter_id,
    ti.invitee_email,
    ti.status
  INTO v_invitation_record
  FROM public.trip_invitations AS ti
  WHERE ti.token = p_token;

  IF NOT FOUND THEN
    RETURN QUERY VALUES (false, 'Invalid invitation token', NULL::uuid);
    RETURN;
  END IF;

  -- Verify invitation is for current user (case-insensitive)
  IF LOWER(TRIM(v_invitation_record.invitee_email)) != LOWER(TRIM(v_user_email)) THEN
    RETURN QUERY VALUES (false, 'This invitation is not for your email address', NULL::uuid);
    RETURN;
  END IF;

  -- Check if invitation is still pending
  IF v_invitation_record.status != 'pending' THEN
    RETURN QUERY VALUES (false, 'Invitation has already been responded to', NULL::uuid);
    RETURN;
  END IF;

  -- Get trip details
  SELECT 
    t.id,
    t.max_participants,
    t.participant_ids,
    t.user_id
  INTO v_trip_record
  FROM public.trips AS t
  WHERE t.id = v_invitation_record.trip_id;

  IF NOT FOUND THEN
    RETURN QUERY VALUES (false, 'Trip not found', NULL::uuid);
    RETURN;
  END IF;

  -- CRITICAL: Ensure we don't change trip ownership
  -- The trip owner should remain the same (v_trip_record.user_id)
  
  -- Check if user is already a participant
  IF v_user_id = ANY(v_trip_record.participant_ids) THEN
    -- Update invitation status anyway
    UPDATE public.trip_invitations AS ti
    SET status = 'accepted', responded_at = now()
    WHERE ti.id = v_invitation_record.id;
    
    RETURN QUERY VALUES (true, 'You are already a participant in this trip', v_invitation_record.trip_id);
    RETURN;
  END IF;

  -- Check if trip is full
  v_participant_count := array_length(v_trip_record.participant_ids, 1);
  IF v_participant_count IS NULL THEN
    v_participant_count := 0;
  END IF;
  
  IF v_participant_count >= v_trip_record.max_participants THEN
    RETURN QUERY VALUES (false, 'Trip is full', NULL::uuid);
    RETURN;
  END IF;

  -- Add user as participant (NOT as owner - they should be 'participant')
  INSERT INTO public.trip_participants (trip_id, user_id, role, joined_at)
  VALUES (v_invitation_record.trip_id, v_user_id, 'participant', now())
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- Mark invitation as accepted
  UPDATE public.trip_invitations AS ti
  SET status = 'accepted', responded_at = now()
  WHERE ti.id = v_invitation_record.id;

  -- IMPORTANT: Do NOT change the trip's user_id - it should remain the original owner
  -- The sync_participants trigger will handle adding to participant_ids array

  RETURN QUERY VALUES (true, 'Successfully joined the trip!', v_invitation_record.trip_id);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_pending_invitations_for_user() TO authenticated;
GRANT EXECUTE ON FUNCTION get_trip_participants_with_users(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trip_with_participants(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;

-- Add helpful indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trip_invitations_invitee_status 
ON trip_invitations(invitee_email, status);

CREATE INDEX IF NOT EXISTS idx_trips_user_id 
ON trips(user_id);

-- Add comments for documentation
COMMENT ON FUNCTION get_pending_invitations_for_user() IS
  'Returns fully enriched pending invitations for the current user with trip and inviter details';

COMMENT ON FUNCTION get_trip_participants_with_users(uuid) IS
  'Returns trip participants with their user details for a given trip';

COMMENT ON FUNCTION get_trip_with_participants(uuid) IS
  'Returns trip details with owner info and participant count';

COMMENT ON FUNCTION public.accept_invitation(text) IS
  'Fixed version that properly maintains trip ownership when accepting invitations';