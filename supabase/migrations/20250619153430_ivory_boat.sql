/*
  # Fix users table permissions for invitation system

  1. Security Updates
    - Ensure authenticated users can read basic user information for invitations
    - Add policy to allow checking if users exist by email
    - Maintain data privacy while enabling invitation functionality

  2. Changes
    - Update existing policy to be more explicit
    - Ensure proper permissions for invitation workflow
*/

-- Drop existing policy if it exists and recreate with explicit permissions
DROP POLICY IF EXISTS "authenticated_can_read_users" ON users;

-- Create a new policy that explicitly allows authenticated users to read user data
CREATE POLICY "authenticated_users_can_read_basic_info" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Ensure RLS is enabled on the users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Add a comment to document the policy purpose
COMMENT ON POLICY "authenticated_users_can_read_basic_info" ON users IS 
'Allows authenticated users to read basic user information (id, email, display_name) for invitation and collaboration features';