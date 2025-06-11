/*
  # Trip Invitations System

  1. New Tables
    - `trip_invitations`
      - `id` (uuid, primary key)
      - `trip_id` (uuid, foreign key to trips)
      - `inviter_id` (uuid, foreign key to users)
      - `invitee_email` (text, email of invited person)
      - `status` (text, enum: pending, accepted, declined)
      - `created_at` (timestamp)
      - `responded_at` (timestamp, nullable)

  2. Security
    - Enable RLS on `trip_invitations` table
    - Add policies for trip owners to create invitations
    - Add policies for invitees to view and respond to their invitations

  3. Functions
    - Function to create trip invitations
    - Function to respond to invitations
*/

-- Create trip invitations table
CREATE TABLE IF NOT EXISTS trip_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(trip_id, invitee_email)
);

-- Enable RLS
ALTER TABLE trip_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for trip invitations
CREATE POLICY "Trip owners can create invitations"
  ON trip_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM trips 
      WHERE id = trip_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Trip owners can view their trip invitations"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    inviter_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM trips 
      WHERE id = trip_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Invitees can view their invitations"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email = (
      SELECT email FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Invitees can respond to their invitations"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invitee_email = (
      SELECT email FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    invitee_email = (
      SELECT email FROM users WHERE id = auth.uid()
    )
  );

-- Function to create trip invitation
CREATE OR REPLACE FUNCTION create_trip_invitation(
  p_trip_id uuid,
  p_invitee_email text
)
RETURNS TABLE(success boolean, message text, invitation_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip_exists boolean;
  v_is_trip_owner boolean;
  v_max_participants integer;
  v_current_participants integer;
  v_pending_invitations integer;
  v_invitation_id uuid;
  v_invitee_already_participant boolean;
BEGIN
  -- Check if trip exists
  SELECT EXISTS(SELECT 1 FROM trips WHERE id = p_trip_id) INTO v_trip_exists;
  
  IF NOT v_trip_exists THEN
    RETURN QUERY SELECT false, 'Trip not found'::text, null::uuid;
    RETURN;
  END IF;

  -- Check if user is the trip owner
  SELECT EXISTS(
    SELECT 1 FROM trips 
    WHERE id = p_trip_id AND user_id = auth.uid()
  ) INTO v_is_trip_owner;
  
  IF NOT v_is_trip_owner THEN
    RETURN QUERY SELECT false, 'Only trip owners can send invitations'::text, null::uuid;
    RETURN;
  END IF;

  -- Check if invitee is already a participant
  SELECT EXISTS(
    SELECT 1 FROM trip_participants tp
    JOIN users u ON tp.user_id = u.id
    WHERE tp.trip_id = p_trip_id AND u.email = p_invitee_email
  ) INTO v_invitee_already_participant;
  
  IF v_invitee_already_participant THEN
    RETURN QUERY SELECT false, 'User is already a participant in this trip'::text, null::uuid;
    RETURN;
  END IF;

  -- Get trip capacity info
  SELECT max_participants INTO v_max_participants 
  FROM trips WHERE id = p_trip_id;
  
  SELECT COUNT(*) INTO v_current_participants 
  FROM trip_participants WHERE trip_id = p_trip_id;

  SELECT COUNT(*) INTO v_pending_invitations
  FROM trip_invitations 
  WHERE trip_id = p_trip_id AND status = 'pending';

  -- Check if trip would be full with pending invitations
  IF (v_current_participants + v_pending_invitations) >= v_max_participants THEN
    RETURN QUERY SELECT false, 'Trip is full or would be full with pending invitations'::text, null::uuid;
    RETURN;
  END IF;

  -- Create invitation (will update if already exists due to UNIQUE constraint)
  INSERT INTO trip_invitations (trip_id, inviter_id, invitee_email)
  VALUES (p_trip_id, auth.uid(), p_invitee_email)
  ON CONFLICT (trip_id, invitee_email) 
  DO UPDATE SET 
    status = 'pending',
    created_at = now(),
    responded_at = null
  RETURNING id INTO v_invitation_id;

  RETURN QUERY SELECT true, 'Invitation sent successfully!'::text, v_invitation_id;
END;
$$;

-- Function to respond to trip invitation
CREATE OR REPLACE FUNCTION respond_to_invitation(
  p_invitation_id uuid,
  p_response text
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation_exists boolean;
  v_trip_id uuid;
  v_max_participants integer;
  v_current_participants integer;
  v_user_id uuid;
BEGIN
  -- Validate response
  IF p_response NOT IN ('accepted', 'declined') THEN
    RETURN QUERY SELECT false, 'Invalid response. Must be "accepted" or "declined"'::text;
    RETURN;
  END IF;

  -- Get current user ID
  SELECT auth.uid() INTO v_user_id;

  -- Check if invitation exists and belongs to current user
  SELECT EXISTS(
    SELECT 1 FROM trip_invitations ti
    JOIN users u ON ti.invitee_email = u.email
    WHERE ti.id = p_invitation_id 
    AND u.id = v_user_id
    AND ti.status = 'pending'
  ) INTO v_invitation_exists;
  
  IF NOT v_invitation_exists THEN
    RETURN QUERY SELECT false, 'Invitation not found or already responded to'::text;
    RETURN;
  END IF;

  -- Get trip info
  SELECT trip_id INTO v_trip_id
  FROM trip_invitations 
  WHERE id = p_invitation_id;

  -- If accepting, check if trip still has space
  IF p_response = 'accepted' THEN
    SELECT max_participants INTO v_max_participants 
    FROM trips WHERE id = v_trip_id;
    
    SELECT COUNT(*) INTO v_current_participants 
    FROM trip_participants WHERE trip_id = v_trip_id;

    IF v_current_participants >= v_max_participants THEN
      RETURN QUERY SELECT false, 'Trip is now full'::text;
      RETURN;
    END IF;

    -- Add user as participant
    INSERT INTO trip_participants (trip_id, user_id, role, joined_at)
    VALUES (v_trip_id, v_user_id, 'participant', now())
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_trip_invitation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION respond_to_invitation(uuid, text) TO authenticated;