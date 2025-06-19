/*
  # Fix ambiguous column reference in accept_invitation RPC function

  1. Problem
    - The `accept_invitation` RPC function has an ambiguous column reference to `trip_id`
    - This occurs because `trip_id` exists in multiple tables involved in the query
    - The error prevents users from accepting trip invitations

  2. Solution
    - Replace the existing function with explicit table aliases
    - Use a local variable to store the trip_id to avoid ambiguity
    - Ensure all column references are fully qualified

  3. Changes
    - Drop and recreate the `accept_invitation` function
    - Add explicit table aliases (trip_invitations AS inv)
    - Use DECLARE variable to capture trip_id unambiguously
    - Grant proper execution permissions
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.accept_invitation(text);

-- Create the corrected function with explicit aliases and local variables
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS TABLE (
  success   boolean,
  message   text,
  trip_id   uuid
) AS
$$
DECLARE
  v_trip_id uuid;
BEGIN
  -- 1) Mark invitation accepted, capture its trip_id
  UPDATE public.trip_invitations AS inv
  SET
    status       = 'accepted',
    responded_at = now()
  WHERE inv.token = p_token
  RETURNING inv.trip_id
  INTO v_trip_id;

  IF NOT FOUND THEN
    -- no invitation matched
    RETURN QUERY
    VALUES (false, 'Invalid or already-handled token', NULL::uuid);
    RETURN;
  END IF;

  -- 2) Add the user to participants
  INSERT INTO public.trip_participants (trip_id, user_id, role, joined_at)
  VALUES (v_trip_id, auth.uid(), 'participant', now());

  -- 3) Return success + the unambiguous v_trip_id
  RETURN QUERY
  VALUES (true, 'Invitation accepted', v_trip_id);
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;