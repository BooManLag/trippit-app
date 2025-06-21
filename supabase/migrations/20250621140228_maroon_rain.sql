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

-- Create a validation function for invitation requests
CREATE OR REPLACE FUNCTION validate_invitation_request(
  p_trip_id uuid,
  p_invitee_email text
)
RETURNS TABLE (
  is_valid boolean,
  error_message text
) AS
$$
DECLARE
  v_inviter_email text;
  v_trip_exists boolean;
  v_existing_invitation_count integer;
  v_participant_count integer;
  v_max_participants integer;
  v_is_already_participant boolean;
BEGIN
  -- Get current user's email (the inviter)
  SELECT email INTO v_inviter_email
  FROM auth.users
  WHERE id = auth.uid();
  
  IF v_inviter_email IS NULL THEN
    RETURN QUERY VALUES (false, 'User not authenticated');
    RETURN;
  END IF;
  
  -- Check if user owns the trip
  SELECT EXISTS(
    SELECT 1 FROM trips 
    WHERE id = p_trip_id AND user_id = auth.uid()
  ) INTO v_trip_exists;
  
  IF NOT v_trip_exists THEN
    RETURN QUERY VALUES (false, 'Trip not found or you are not the owner');
    RETURN;
  END IF;
  
  -- Check if trying to invite themselves (case-insensitive)
  IF LOWER(TRIM(p_invitee_email)) = LOWER(TRIM(v_inviter_email)) THEN
    RETURN QUERY VALUES (false, 'You cannot invite yourself to a trip');
    RETURN;
  END IF;
  
  -- Check if the invitee is already a participant
  SELECT EXISTS(
    SELECT 1 FROM trips t
    JOIN users u ON u.email = p_invitee_email
    WHERE t.id = p_trip_id AND u.id = ANY(t.participant_ids)
  ) INTO v_is_already_participant;
  
  IF v_is_already_participant THEN
    RETURN QUERY VALUES (false, 'This person is already a participant in the trip');
    RETURN;
  END IF;
  
  -- Check if already invited (any status)
  SELECT COUNT(*) INTO v_existing_invitation_count
  FROM trip_invitations
  WHERE trip_id = p_trip_id 
    AND LOWER(TRIM(invitee_email)) = LOWER(TRIM(p_invitee_email));
    
  IF v_existing_invitation_count > 0 THEN
    RETURN QUERY VALUES (false, 'This email has already been invited to this trip');
    RETURN;
  END IF;
  
  -- Check if trip is full
  SELECT 
    array_length(participant_ids, 1),
    max_participants
  INTO v_participant_count, v_max_participants
  FROM trips
  WHERE id = p_trip_id;
  
  IF v_participant_count IS NULL THEN
    v_participant_count := 0;
  END IF;
  
  IF v_participant_count >= v_max_participants THEN
    RETURN QUERY VALUES (false, 'Trip is already full');
    RETURN;
  END IF;
  
  -- All validations passed
  RETURN QUERY VALUES (true, 'Invitation is valid');
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_pending_invitations_for_user() TO authenticated;
GRANT EXECUTE ON FUNCTION get_trip_participants_with_users(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trip_with_participants(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invitation_request(uuid, text) TO authenticated;

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

COMMENT ON FUNCTION validate_invitation_request(uuid, text) IS
  'Validates invitation requests before sending. Checks for self-invitations, duplicates, trip capacity, and other business rules.';