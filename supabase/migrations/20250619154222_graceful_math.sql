/*
  # Fix Users Table RLS Policy

  1. Security Updates
    - Enable RLS on public.users table
    - Drop any existing conflicting policies
    - Create proper policy for authenticated users to read basic user info
    - Add comment for documentation

  2. Changes Made
    - Ensures authenticated users can read id, email, display_name from users table
    - This fixes the "permission denied for table users" error in invitation system
    - Allows the invitation service to check if users exist and fetch user details
*/

-- Ensure RLS is enabled on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS authenticated_can_read_users ON public.users;
DROP POLICY IF EXISTS authenticated_users_can_read_basic_info ON public.users;

-- Create the correct policy for authenticated users to read basic user info
CREATE POLICY authenticated_users_can_read_basic_info
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Add a comment to document the policy
COMMENT ON POLICY authenticated_users_can_read_basic_info
  ON public.users IS
  'Allows authenticated sessions to select (id, email, display_name) from users table. Required for invitation system to check user existence and fetch user details.';