/*
  # Fix Users Table RLS Permissions

  1. Security Updates
    - Drop any conflicting or incorrect policies on users table
    - Ensure RLS is enabled on users table
    - Create a single, clear SELECT policy for authenticated users
    
  2. Changes
    - Remove any existing problematic policies
    - Add proper SELECT policy for authenticated users to read basic user info
    - This enables the invitation system to check if users exist
*/

-- Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might be conflicting
DROP POLICY IF EXISTS authenticated_can_read_users ON public.users;
DROP POLICY IF EXISTS users_can_read_all ON public.users;
DROP POLICY IF EXISTS authenticated_users_can_read_basic_info ON public.users;

-- Create a single, explicit SELECT policy for authenticated users
CREATE POLICY authenticated_users_can_read_basic_info
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Verify the existing policies for INSERT and UPDATE are still in place
-- (These should already exist based on the schema, but we'll recreate them to be safe)

-- Drop and recreate INSERT policy
DROP POLICY IF EXISTS users_insert_own_profile ON public.users;
CREATE POLICY users_insert_own_profile
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Drop and recreate UPDATE policy  
DROP POLICY IF EXISTS users_update_own_data ON public.users;
CREATE POLICY users_update_own_data
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());