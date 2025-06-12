/*
  # Fix invitation system for email-based invitations

  1. Ensure proper RLS policies for trip invitations
  2. Add function to handle invitation responses
  3. Ensure proper constraints and indexes
*/

-- Ensure proper RLS policies for trip_invitations table
DROP POLICY IF EXISTS "Users can create invitations for their trips" ON trip_invitations;
DROP POLICY IF EXISTS "Users can read invitations sent to them" ON trip_invitations;
DROP POLICY IF EXISTS "Users can read invitations they sent" ON trip_invitations;
DROP POLICY IF EXISTS "Users can respond to their invitations" ON trip_invitations;

-- Allow users to create invitations for trips they participate in
CREATE POLICY "Users can create invitations for their trips"
  ON trip_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_id = auth.uid() AND
    trip_id IN (
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
    )
  );

-- Allow users to read invitations sent to their email
CREATE POLICY "Users can read invitations sent to them"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Allow users to read invitations they sent
CREATE POLICY "Users can read invitations they sent"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (inviter_id = auth.uid());

-- Allow users to respond to invitations sent to their email
CREATE POLICY "Users can respond to their invitations"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invitee_email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    invitee_email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Create function to handle invitation responses
CREATE OR REPLACE FUNCTION respond_to_invitation(
  p_invitation_id UUID,
  p_response TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_invitation trip_invitations%ROWTYPE;
  v_user_id UUID;
  v_participant_count INTEGER;
  v_max_participants INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not authenticated';
    RETURN;
  END IF;

  -- Get invitation details
  SELECT * INTO v_invitation
  FROM trip_invitations
  WHERE id = p_invitation_id
    AND invitee_email IN (
      SELECT email FROM auth.users WHERE id = v_user_id
    )
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invitation not found or already responded';
    RETURN;
  END IF;

  -- Validate response
  IF p_response NOT IN ('accepted', 'declined') THEN
    RETURN QUERY SELECT FALSE, 'Invalid response. Must be "accepted" or "declined"';
    RETURN;
  END IF;

  -- If accepting, check if trip has space
  IF p_response = 'accepted' THEN
    -- Get current participant count and max participants
    SELECT COUNT(*), t.max_participants
    INTO v_participant_count, v_max_participants
    FROM trip_participants tp
    JOIN trips t ON tp.trip_id = t.id
    WHERE tp.trip_id = v_invitation.trip_id
    GROUP BY t.max_participants;

    -- Handle case where no participants exist yet
    IF v_participant_count IS NULL THEN
      v_participant_count := 0;
      SELECT max_participants INTO v_max_participants
      FROM trips WHERE id = v_invitation.trip_id;
    END IF;

    -- Check if trip is full
    IF v_participant_count >= v_max_participants THEN
      RETURN QUERY SELECT FALSE, 'Trip is full';
      RETURN;
    END IF;

    -- Check if user is already a participant
    IF EXISTS (
      SELECT 1 FROM trip_participants 
      WHERE trip_id = v_invitation.trip_id AND user_id = v_user_id
    ) THEN
      RETURN QUERY SELECT FALSE, 'You are already a participant in this trip';
      RETURN;
    END IF;

    -- Add user as participant
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (v_invitation.trip_id, v_user_id, 'participant');
  END IF;

  -- Update invitation status
  UPDATE trip_invitations
  SET status = p_response, responded_at = NOW()
  WHERE id = p_invitation_id;

  -- Return success message
  IF p_response = 'accepted' THEN
    RETURN QUERY SELECT TRUE, 'Successfully joined the trip!';
  ELSE
    RETURN QUERY SELECT TRUE, 'Invitation declined';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_trip_invitations_invitee_email 
ON trip_invitations(invitee_email);

CREATE INDEX IF NOT EXISTS idx_trip_invitations_trip_id 
ON trip_invitations(trip_id);

CREATE INDEX IF NOT EXISTS idx_trip_invitations_status 
ON trip_invitations(status);

-- Ensure unique constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trip_invitations_trip_id_invitee_email_key' 
    AND table_name = 'trip_invitations'
  ) THEN
    ALTER TABLE trip_invitations 
    ADD CONSTRAINT trip_invitations_trip_id_invitee_email_key 
    UNIQUE (trip_id, invitee_email);
  END IF;
END $$;