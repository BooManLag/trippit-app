/*
  # Fix Self-Invitation Issue

  1. Changes
    - Enhanced prevent_self_invitation trigger function with better error handling
    - Create validation function for frontend use
    - Remove problematic check constraint (PostgreSQL doesn't allow subqueries in check constraints)
    - Add performance indexes
    - Clean up existing self-invitations

  2. Security
    - Prevent self-invitations through trigger function
    - Add comprehensive validation function
    - Maintain all existing RLS policies
*/

-- Drop and recreate the prevent_self_invitation function with better logic
CREATE OR REPLACE FUNCTION prevent_self_invitation()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_inviter_email text;
BEGIN
  -- Get the inviter's email with explicit error handling
  SELECT email INTO v_inviter_email
  FROM auth.users
  WHERE id = NEW.inviter_id;
  
  -- If we can't find the inviter's email, something is wrong
  IF v_inviter_email IS NULL THEN
    RAISE EXCEPTION 'Inviter user not found: %', NEW.inviter_id;
  END IF;
  
  -- Check if trying to invite themselves (case-insensitive comparison)
  IF LOWER(TRIM(NEW.invitee_email)) = LOWER(TRIM(v_inviter_email)) THEN
    RAISE EXCEPTION 'Cannot invite yourself to a trip. Inviter email: %, Invitee email: %', 
      v_inviter_email, NEW.invitee_email;
  END IF;
  
  -- Log successful validation for debugging
  RAISE NOTICE 'Invitation validation passed. Inviter: %, Invitee: %', 
    v_inviter_email, NEW.invitee_email;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger is properly configured
DROP TRIGGER IF EXISTS trigger_prevent_self_invitation ON public.trip_invitations;
CREATE TRIGGER trigger_prevent_self_invitation
  BEFORE INSERT OR UPDATE ON public.trip_invitations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_invitation();

-- Create a validation function that can be called from the frontend
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
GRANT EXECUTE ON FUNCTION validate_invitation_request(uuid, text) TO authenticated;

-- Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_invitations_invitee_email_lower 
ON trip_invitations(LOWER(invitee_email));

-- Clean up any existing self-invitations that might exist
DELETE FROM public.trip_invitations 
WHERE EXISTS (
  SELECT 1 FROM auth.users 
  WHERE auth.users.id = trip_invitations.inviter_id 
  AND LOWER(TRIM(auth.users.email)) = LOWER(TRIM(trip_invitations.invitee_email))
);

-- Add comment for documentation
COMMENT ON FUNCTION prevent_self_invitation() IS
  'Enhanced trigger function to prevent users from inviting themselves to trips. Includes better error handling and case-insensitive email comparison.';

COMMENT ON FUNCTION validate_invitation_request(uuid, text) IS
  'Validates invitation requests before sending. Checks for self-invitations, duplicates, trip capacity, and other business rules.';