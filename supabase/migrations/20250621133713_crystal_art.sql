/*
  # Fix accept_invitation RPC function

  1. Problem
    - The accept_invitation function has ambiguous column references to "trip_id"
    - This occurs when multiple tables in the query have the same column name
    - The error prevents users from accepting trip invitations

  2. Solution
    - Drop and recreate the accept_invitation function with explicit table aliases
    - Use fully qualified column names to avoid ambiguity
    - Ensure all column references are clear and unambiguous

  3. Changes
    - Replace the existing function with proper table qualification
    - Use explicit aliases for all tables
    - Return the correct trip_id without ambiguity
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS public.accept_invitation(text);

-- Create the corrected function with explicit table aliases and qualified column names
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
  v_trip_record RECORD;
  v_participant_count integer;
BEGIN
  -- Get current user info
  SELECT email INTO v_user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  IF v_user_email IS NULL THEN
    RETURN QUERY VALUES (false, 'User not authenticated', NULL::uuid);
    RETURN;
  END IF;

  -- Get invitation details with explicit table alias and column selection
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

  -- Verify invitation is for current user
  IF LOWER(v_invitation_record.invitee_email) != LOWER(v_user_email) THEN
    RETURN QUERY VALUES (false, 'This invitation is not for your email address', NULL::uuid);
    RETURN;
  END IF;

  -- Check if invitation is still pending
  IF v_invitation_record.status != 'pending' THEN
    RETURN QUERY VALUES (false, 'Invitation has already been responded to', NULL::uuid);
    RETURN;
  END IF;

  -- Get trip details with explicit table alias
  SELECT 
    t.id,
    t.max_participants,
    t.participant_ids
  INTO v_trip_record
  FROM public.trips AS t
  WHERE t.id = v_invitation_record.trip_id;

  IF NOT FOUND THEN
    RETURN QUERY VALUES (false, 'Trip not found', NULL::uuid);
    RETURN;
  END IF;

  -- Check if user is already a participant
  IF auth.uid() = ANY(v_trip_record.participant_ids) THEN
    -- Update invitation status anyway with explicit table alias
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

  -- Add user as participant (this will trigger the sync function to update participant_ids)
  INSERT INTO public.trip_participants (trip_id, user_id, role, joined_at)
  VALUES (v_invitation_record.trip_id, auth.uid(), 'participant', now())
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  -- Mark invitation as accepted with explicit table alias
  UPDATE public.trip_invitations AS ti
  SET status = 'accepted', responded_at = now()
  WHERE ti.id = v_invitation_record.id;

  RETURN QUERY VALUES (true, 'Successfully joined the trip!', v_invitation_record.trip_id);
END;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.accept_invitation(text) IS
  'Accepts a trip invitation using a secure token. Fixed version with proper table aliases to avoid column ambiguity.';