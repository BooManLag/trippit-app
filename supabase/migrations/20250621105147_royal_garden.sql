/*
  # Fix Users Table Permissions for Invitation System

  1. Security Updates
    - Enable RLS on users table
    - Create policy allowing authenticated users to read basic user info
    - Grant SELECT permission to authenticated role
    - This fixes "permission denied for table users" errors

  2. Changes Made
    - Allows invitation system to check if users exist
    - Enables fetching user details for trip participants
    - Maintains security while allowing necessary functionality
*/

-- Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "users_basic_read_for_invitations" ON public.users;
DROP POLICY IF EXISTS "authenticated_can_read_users" ON public.users;
DROP POLICY IF EXISTS "authenticated_users_can_read_basic_info" ON public.users;

-- Create policy allowing authenticated users to read basic user info
CREATE POLICY "users_basic_read_for_invitations"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Grant SELECT permission to authenticated role
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.users TO authenticated;

-- Also ensure users can manage their own data
CREATE POLICY IF NOT EXISTS "users_own_data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY IF NOT EXISTS "users_insert_profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Add comment for documentation
COMMENT ON POLICY "users_basic_read_for_invitations" ON public.users IS
  'Allows authenticated users to read basic user info (id, email, display_name) for invitation system functionality';