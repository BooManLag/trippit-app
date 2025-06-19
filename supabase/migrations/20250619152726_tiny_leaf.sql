/*
  # Fix users table permissions for invitations

  1. Security Updates
    - Enable RLS on `users` table (if not already enabled)
    - Drop existing conflicting policy if it exists
    - Add policy for authenticated users to read user data
    
  2. Changes
    - Allows authenticated users to SELECT from `users` table
    - Fixes permission denied errors in invitation service
    - Enables user existence checks and user detail fetching
    
  3. Notes
    - This policy allows any authenticated user to read basic user info
    - Required for invitation system to function properly
    - Does not affect existing INSERT/UPDATE policies for user profiles
*/

-- Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS authenticated_can_read_users ON public.users;

-- Grant SELECT (read) permissions to any authenticated user
-- This allows the invitation service to check user existence and fetch user details
CREATE POLICY authenticated_can_read_users
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);