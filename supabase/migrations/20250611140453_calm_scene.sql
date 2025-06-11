/*
  # Fix join_trip function with proper return type

  1. Changes
    - Drop existing join_trip function first to avoid return type conflict
    - Create new join_trip function with TABLE return type
    - Function validates trip existence, capacity, and user eligibility
    - Returns structured response with success/error information

  2. Security
    - Uses SECURITY DEFINER for proper access control
    - Validates all inputs before making changes
*/

-- Drop the existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS join_trip(uuid, uuid);

-- Create the new function with proper return type
CREATE OR REPLACE FUNCTION join_trip(p_trip_id uuid, p_user_id uuid)
RETURNS TABLE(success boolean, message text, error text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip_exists boolean;
  v_max_participants integer;
  v_current_participants integer;
  v_is_already_participant boolean;
  v_is_trip_owner boolean;
BEGIN
  -- Check if trip exists
  SELECT EXISTS(SELECT 1 FROM trips WHERE id = p_trip_id) INTO v_trip_exists;
  
  IF NOT v_trip_exists THEN
    RETURN QUERY SELECT false, ''::text, 'Trip not found'::text;
    RETURN;
  END IF;

  -- Check if user is the trip owner
  SELECT EXISTS(SELECT 1 FROM trips WHERE id = p_trip_id AND user_id = p_user_id) INTO v_is_trip_owner;
  
  IF v_is_trip_owner THEN
    RETURN QUERY SELECT false, ''::text, 'You are already the owner of this trip'::text;
    RETURN;
  END IF;

  -- Check if user is already a participant
  SELECT EXISTS(
    SELECT 1 FROM trip_participants 
    WHERE trip_id = p_trip_id AND user_id = p_user_id
  ) INTO v_is_already_participant;
  
  IF v_is_already_participant THEN
    RETURN QUERY SELECT false, ''::text, 'You are already a participant in this trip'::text;
    RETURN;
  END IF;

  -- Get trip capacity info
  SELECT max_participants INTO v_max_participants 
  FROM trips WHERE id = p_trip_id;
  
  SELECT COUNT(*) INTO v_current_participants 
  FROM trip_participants WHERE trip_id = p_trip_id;

  -- Check if trip is full
  IF v_current_participants >= v_max_participants THEN
    RETURN QUERY SELECT false, ''::text, 'Trip is full'::text;
    RETURN;
  END IF;

  -- Add user as participant
  INSERT INTO trip_participants (trip_id, user_id, role, joined_at)
  VALUES (p_trip_id, p_user_id, 'participant', now());

  RETURN QUERY SELECT true, 'Successfully joined the trip!'::text, ''::text;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION join_trip(uuid, uuid) TO authenticated;