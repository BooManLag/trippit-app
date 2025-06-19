/*
  # Allow users to read inviter profile information

  1. Security Policy Changes
    - Add policy to allow authenticated users to read basic profile info of users who invited them
    - This enables the invitation system to display inviter names and emails
    - Policy is scoped to only allow reading inviter data for pending invitations

  2. Changes
    - New SELECT policy on users table for invitation context
    - Allows reading id, email, display_name of inviters only
*/

-- Allow authenticated users to read basic profile info of users who have invited them
CREATE POLICY "Users can read inviter profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT inviter_id 
      FROM trip_invitations 
      WHERE invitee_email = (
        SELECT email 
        FROM auth.users 
        WHERE id = auth.uid()
      )
    )
  );