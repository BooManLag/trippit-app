/*
  # Fix Users Table RLS Policy for Invitations

  1. Security Updates
    - Add RLS policy to allow authenticated users to read basic profiles based on relationships
    - Allow users to read profiles of people who invited them
    - Allow users to read profiles of people they invited
    - Allow users to read profiles of other participants in shared trips

  2. Changes
    - Create new SELECT policy for invitation-related user profile access
    - Maintains existing security while enabling invitation functionality
*/

-- Create policy to allow authenticated users to read basic profiles based on relationships
CREATE POLICY "Allow reading profiles for invitation relationships"
ON public.users FOR SELECT
TO authenticated
USING (
  -- Allow users to read profiles of people who invited them
  EXISTS (
    SELECT 1
    FROM public.trip_invitations
    WHERE
      trip_invitations.invitee_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )::text
      AND trip_invitations.inviter_id = users.id
  )
  OR
  -- Allow users to read profiles of people they invited
  EXISTS (
    SELECT 1
    FROM public.trip_invitations
    WHERE
      trip_invitations.inviter_id = auth.uid()
      AND trip_invitations.invitee_email = users.email
  )
  OR
  -- Allow users to read profiles of other participants in shared trips
  EXISTS (
    SELECT 1
    FROM public.trip_participants AS tp1
    JOIN public.trip_participants AS tp2
      ON tp1.trip_id = tp2.trip_id
    WHERE
      tp1.user_id = auth.uid() AND tp2.user_id = users.id
  )
);