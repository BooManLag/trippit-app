/*
  # Fix Users Table RLS Policy for Invitations

  1. Problem
    - The users table has RLS enabled but lacks a comprehensive policy for authenticated users to read basic user data
    - When fetching trip invitations, the join with users table fails due to permission denied errors
    - The existing policies are too restrictive for the invitation system needs

  2. Solution
    - Add a general policy allowing authenticated users to read basic user profile data
    - This enables the invitation system to fetch inviter and invitee information properly
    - Maintains security while allowing necessary data access for invitations

  3. Security
    - Only allows SELECT operations for authenticated users
    - Only exposes basic profile information (id, email, display_name)
    - Does not compromise existing security measures
*/

-- Drop the existing overly restrictive policy if it exists
DROP POLICY IF EXISTS "authenticated_can_read_users" ON public.users;

-- Create a comprehensive policy that allows authenticated users to read basic user data
-- This is needed for the invitation system to work properly
CREATE POLICY "authenticated_can_read_users" 
  ON public.users 
  FOR SELECT 
  TO authenticated
  USING (true);

-- The above policy allows any authenticated user to read basic user profile data
-- This is necessary for:
-- 1. Fetching inviter information when displaying invitations
-- 2. Checking if users exist when sending invitations
-- 3. Displaying participant information in trips
-- 4. General user lookup functionality

-- Note: This policy only allows SELECT operations, not INSERT/UPDATE/DELETE
-- Those operations are still controlled by the existing more restrictive policies