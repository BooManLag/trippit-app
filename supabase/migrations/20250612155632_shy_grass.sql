/*
  # Simplified Trip Sharing System

  1. Database Changes
    - Remove trip_participants table completely
    - Keep only trip_invitations for email-based invitations
    - Use trips.user_id for ownership
    - Simplify all policies

  2. Security
    - Trip owners can manage their trips
    - Invited users can view trips they're invited to
    - Simple RLS policies

  3. Functionality
    - Email-based invitations only
    - No complex participant management
    - Clean and simple structure
*/

-- Drop the trip_participants table completely since we don't need it
DROP TABLE IF EXISTS trip_participants CASCADE;

-- Keep trip_invitations but simplify it
DROP TABLE IF EXISTS trip_invitations CASCADE;

CREATE TABLE trip_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  
  -- Ensure one invitation per email per trip
  UNIQUE(trip_id, invitee_email)
);

-- Enable RLS
ALTER TABLE trip_invitations ENABLE ROW LEVEL SECURITY;

-- Simple policies for trip_invitations
CREATE POLICY "invitations_owner_manage"
  ON trip_invitations
  FOR ALL
  TO authenticated
  USING (
    inviter_id = auth.uid() OR
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  )
  WITH CHECK (
    inviter_id = auth.uid() OR
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

CREATE POLICY "invitations_invitee_read"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "invitations_invitee_update"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Drop all existing trip policies
DROP POLICY IF EXISTS "trips_owner_full_access" ON trips;
DROP POLICY IF EXISTS "trips_participant_read" ON trips;
DROP POLICY IF EXISTS "trips_invited_read" ON trips;
DROP POLICY IF EXISTS "trips_anonymous_read" ON trips;

-- Simple trip policies
CREATE POLICY "trips_owner_full_access"
  ON trips
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trips_invited_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT trip_id FROM trip_invitations 
      WHERE invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND status = 'pending'
    )
  );

-- Simple function to respond to invitations (no participants table needed)
CREATE OR REPLACE FUNCTION respond_to_invitation(
  p_invitation_id uuid,
  p_response text
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation trip_invitations%ROWTYPE;
  v_user_id uuid;
  v_user_email text;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User not authenticated';
    RETURN;
  END IF;

  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  
  -- Get invitation
  SELECT * INTO v_invitation 
  FROM trip_invitations 
  WHERE id = p_invitation_id AND invitee_email = v_user_email;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invitation not found or not for this user';
    RETURN;
  END IF;
  
  IF v_invitation.status != 'pending' THEN
    RETURN QUERY SELECT false, 'Invitation already responded to';
    RETURN;
  END IF;
  
  -- Update invitation status
  UPDATE trip_invitations 
  SET status = p_response, responded_at = now()
  WHERE id = p_invitation_id;
  
  IF p_response = 'accepted' THEN
    RETURN QUERY SELECT true, 'Invitation accepted! You can now view this trip.';
  ELSE
    RETURN QUERY SELECT true, 'Invitation declined';
  END IF;
END;
$$;

-- Remove the trigger since we don't need participants table
DROP TRIGGER IF EXISTS on_trip_created ON trips;
DROP FUNCTION IF EXISTS add_trip_owner_as_participant();

-- Update users policies to allow reading for invitation context
DROP POLICY IF EXISTS "users_own_data" ON users;
DROP POLICY IF EXISTS "users_trip_context_read" ON users;

CREATE POLICY "users_own_data"
  ON users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_invitation_context_read"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Allow reading inviter details for received invitations
    id IN (
      SELECT inviter_id FROM trip_invitations 
      WHERE invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );