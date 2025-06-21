/*
  # Trip Management Functions and Triggers

  1. Functions
    - sync_participants: Sync participant_ids array with trip_participants table
    - add_trip_owner_as_participant: Add trip owner as participant when trip is created
    - accept_invitation: Accept trip invitation by token
    - prevent_self_invitation: Prevent users from inviting themselves

  2. Triggers
    - Sync participant_ids array automatically
    - Add owner as participant on trip creation
    - Prevent self-invitations
*/

-- Trigger function to sync participant_ids array
CREATE OR REPLACE FUNCTION public.sync_participants()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- Add user to participant_ids array
    UPDATE trips
    SET participant_ids = array_append(participant_ids, NEW.user_id)
    WHERE id = NEW.trip_id
    AND NOT (NEW.user_id = ANY(participant_ids)); -- Avoid duplicates
    
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    -- Remove user from participant_ids array
    UPDATE trips
    SET participant_ids = array_remove(participant_ids, OLD.user_id)
    WHERE id = OLD.trip_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create triggers to sync participant_ids
DROP TRIGGER IF EXISTS trg_tp_insert ON trip_participants;
DROP TRIGGER IF EXISTS trg_tp_delete ON trip_participants;

CREATE TRIGGER trg_tp_insert
  AFTER INSERT ON trip_participants
  FOR EACH ROW 
  EXECUTE FUNCTION sync_participants();

CREATE TRIGGER trg_tp_delete
  AFTER DELETE ON trip_participants
  FOR EACH ROW 
  EXECUTE FUNCTION sync_participants();

-- Function to add trip owner as participant when trip is created
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  -- Only add participant if user_id is not null (authenticated trip)
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to add owner as participant
DROP TRIGGER IF EXISTS on_trip_created ON trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();

-- Function to prevent self-invitations
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
DROP TRIGGER IF EXISTS trigger_prevent_self_invitation ON trip_invitations;
CREATE TRIGGER trigger_prevent_self_invitation
  BEFORE INSERT OR UPDATE ON trip_invitations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_invitation();

-- SECURITY DEFINER function to accept invitations
CREATE OR REPLACE FUNCTION accept_invitation(p_token text)
RETURNS TABLE(success boolean, message text, joined_trip_id uuid)
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
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;