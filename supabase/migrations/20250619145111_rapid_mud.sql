/*
  # Fix Users Table RLS Policy

  1. Security Updates
    - Ensure RLS is enabled on users table
    - Drop and recreate the authenticated_can_read_users policy to fix permission issues
    - Simplify the policy to allow authenticated users to read all user data needed for invitations

  2. Changes
    - Enable RLS on users table (if not already enabled)
    - Replace the existing authenticated_can_read_users policy with a simpler, more permissive one
    - This will allow invitation queries to properly join with user data
*/

-- Ensure RLS is enabled on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop the existing policy that might be causing issues
DROP POLICY IF EXISTS authenticated_can_read_users ON public.users;

-- Create a new, simpler policy that allows authenticated users to read all user data
CREATE POLICY authenticated_can_read_users
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);