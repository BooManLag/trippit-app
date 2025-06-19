/*
  # Fix RLS policy for users table

  1. Security
    - Enable RLS on users table (if not already enabled)
    - Create policy to allow authenticated users to read basic user info
    - This fixes the "permission denied for table users" error

  This migration addresses the 403 permission errors when trying to read from the users table.
*/

-- Ensure RLS is enabled on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "authenticated_can_read_users" ON public.users;
DROP POLICY IF EXISTS "authenticated_users_can_read_basic_info" ON public.users;

-- Create a new policy that allows authenticated users to read basic user information
CREATE POLICY "authenticated_can_read_basic_info"
  ON public.users
  FOR SELECT
  TO authenticated
  USING ( true );

-- Add a comment to document the policy
COMMENT ON POLICY "authenticated_can_read_basic_info" ON public.users IS
  'Allows any logged-in user to read other users'' id, email, display_name for invitation and collaboration features';