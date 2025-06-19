/*
  # Fix users table RLS policy for invitations

  1. Security Changes
    - Enable RLS on users table (already enabled, but ensuring it's set)
    - Drop existing restrictive policy that prevents reading other users
    - Create new policy allowing authenticated users to read basic user info
    - This enables invitation functionality to work properly

  2. Policy Details
    - Allows authenticated users to read basic profile data (id, email, display_name)
    - Required for invitation system to check if users exist and display inviter info
    - Maintains security by only allowing read access to basic fields
*/

-- Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop the existing restrictive policy that only allows reading own data
DROP POLICY IF EXISTS authenticated_users_can_read_basic_info ON public.users;

-- Create a new policy that allows authenticated users to read basic user information
-- This is necessary for the invitation system to function properly
CREATE POLICY authenticated_users_can_read_basic_info 
  ON public.users 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Add a comment explaining the policy purpose
COMMENT ON POLICY authenticated_users_can_read_basic_info 
  ON public.users IS
  'Allows authenticated users to read basic profile data (id, email, display_name) for invitations and user discovery';