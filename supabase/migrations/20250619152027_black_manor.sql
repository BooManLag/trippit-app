/*
  # Fix invitation self-invite and trip visibility issues

  1. Changes
    - Fix trip visibility: users only see trips they own or are participants in (not just invited)
    - Fix invitation visibility: users only see invitations sent TO them
    - Prevent self-invitations using trigger function (not check constraint)
    - Improve invitation acceptance function
    - Add validation function for frontend use
    - Clean up existing self-invitations

  2. Security
    - Maintain RLS on all tables
    - Improve invitation policies
    - Add validation functions
*/

-- 1) Fix TRIPS table policies - users should NOT see trips just because they're invited
--    They should only see trips after accepting the invitation

-- Drop existing trip policies
DROP POLICY IF EXISTS auth_trips_select ON public.trips;
DROP POLICY IF EXISTS trips_anonymous_access ON public.trips;

-- Users can only see trips they OWN or are PARTICIPANTS in (not just invited to)
CREATE POLICY auth_trips_select
  ON public.trips FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    auth.uid() = ANY(participant_ids)
  );

-- Allow anonymous access to trips without owners
CREATE POLICY trips_anonymous_access
  ON public.trips FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- 2) Fix TRIP_INVITATIONS table policies - prevent seeing self-invitations

-- Drop existing invitation policies
DROP POLICY IF EXISTS auth_trip_invitations_select ON public.trip_invitations;

-- Users can see invitations sent TO them (not FROM them, unless they're checking their own sent invitations)
-- Split this into two separate policies for clarity
CREATE POLICY invitations_received_by_user
  ON public.trip_invitations FOR SELECT
  TO authenticated
  USING (
    invitee_email = auth.jwt() ->> 'email'
  );

-- Trip owners can see invitations they sent for their trips
CREATE POLICY invitations_sent_by_trip_owner
  ON public.trip_invitations FOR SELECT
  TO authenticated
  USING (
    inviter_id = auth.uid() AND
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- 3) Create trigger function to prevent self-invitations
-- (Cannot use check constraint with subquery, so use trigger instead)

CREATE OR REPLACE FUNCTION prevent_self_invitation()
RETURNS TRIGGER AS $$
DECLARE
  v_inviter_email text;
BEGIN
  -- Get the inviter's email
  SELECT email INTO v_inviter_email
  FROM auth.users
  WHERE id = NEW.inviter_id;
  
  -- Check if trying to invite themselves
  IF LOWER(NEW.invitee_email) = LOWER(v_inviter_email) THEN
    RAISE EXCEPTION 'Cannot invite yourself to a trip';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent self-invitations
DROP TRIGGER IF EXISTS trigger_prevent_self_invitation ON public.trip_invitations;
CREATE TRIGGER trigger_prevent_self_invitation
  BEFORE INSERT OR UPDATE ON public.trip_invitations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_invitation();

-- 4) Update the accept_invitation function to be more robust

CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS TABLE (
  success   boolean,
  message   text,
  trip_id   uuid
) AS
$$
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

  -- Get invitation details with explicit column selection
  SELECT 
    inv.id,
    inv.trip_id,
    inv.inviter_id,
    inv.invitee_email,
    inv.status
  INTO v_invitation_record
  FROM public.trip_invitations AS inv
  WHERE inv.token = p_token;

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

  -- Get trip details
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
    -- Update invitation status anyway
    UPDATE public.trip_invitations 
    SET status = 'accepted', responded_at = now()
    WHERE id = v_invitation_record.id;
    
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

  -- Mark invitation as accepted
  UPDATE public.trip_invitations 
  SET status = 'accepted', responded_at = now()
  WHERE id = v_invitation_record.id;

  RETURN QUERY VALUES (true, 'Successfully joined the trip!', v_invitation_record.trip_id);
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER;

-- 5) Create a function to validate invitations before sending (for the frontend to use)

CREATE OR REPLACE FUNCTION public.validate_invitation(
  p_trip_id uuid,
  p_invitee_email text
)
RETURNS TABLE (
  valid boolean,
  message text
) AS
$$
DECLARE
  v_trip_owner_email text;
  v_existing_invitation_count integer;
  v_participant_count integer;
  v_max_participants integer;
BEGIN
  -- Get trip owner's email
  SELECT u.email INTO v_trip_owner_email
  FROM trips t
  JOIN users u ON u.id = t.user_id
  WHERE t.id = p_trip_id AND t.user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN QUERY VALUES (false, 'Trip not found or you are not the owner');
    RETURN;
  END IF;
  
  -- Check if trying to invite yourself
  IF LOWER(p_invitee_email) = LOWER(v_trip_owner_email) THEN
    RETURN QUERY VALUES (false, 'You cannot invite yourself to a trip');
    RETURN;
  END IF;
  
  -- Check if already invited
  SELECT COUNT(*) INTO v_existing_invitation_count
  FROM trip_invitations
  WHERE trip_id = p_trip_id 
    AND LOWER(invitee_email) = LOWER(p_invitee_email)
    AND status = 'pending';
    
  IF v_existing_invitation_count > 0 THEN
    RETURN QUERY VALUES (false, 'This email has already been invited');
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
  
  RETURN QUERY VALUES (true, 'Invitation is valid');
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invitation(uuid, text) TO authenticated;

-- 6) Clean up any existing invalid invitations (self-invitations)
-- This will remove any existing self-invitations that might be causing the issue

DELETE FROM public.trip_invitations 
WHERE EXISTS (
  SELECT 1 FROM auth.users 
  WHERE auth.users.id = trip_invitations.inviter_id 
  AND LOWER(auth.users.email) = LOWER(trip_invitations.invitee_email)
);

-- 7) Add helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_invitations_invitee_email_status 
ON trip_invitations(invitee_email, status);

CREATE INDEX IF NOT EXISTS idx_trip_invitations_inviter_trip 
ON trip_invitations(inviter_id, trip_id);

-- 8) Add index on trips participant_ids for better performance
CREATE INDEX IF NOT EXISTS idx_trips_participant_ids 
ON trips USING GIN (participant_ids);