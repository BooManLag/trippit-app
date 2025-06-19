/*
  # Fix users table permissions for invitation system

  1. Changes
    - Drop any existing policies that might conflict
    - Create clear, simple policies for users table access
    - Allow authenticated users to read user profiles for invitation checking

  2. Security
    - Maintain RLS on users table
    - Allow reading profiles for invitation functionality
    - Restrict updates to own profile only
*/

-- Enable RLS on the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "authenticated_can_read_users" ON public.users;
DROP POLICY IF EXISTS "anon_can_read_basic_users" ON public.users;
DROP POLICY IF EXISTS "public_read_for_invitations" ON public.users;
DROP POLICY IF EXISTS "users_update_own_data" ON public.users;
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Auth service can insert users" ON public.users;
DROP POLICY IF EXISTS "users_own_data" ON public.users;
DROP POLICY IF EXISTS "users_invitation_read" ON public.users;
DROP POLICY IF EXISTS "users_trip_context_read" ON public.users;

-- Create new, simple policies

-- Allow authenticated users to read all user profiles (needed for invitation system)
CREATE POLICY "authenticated_can_read_users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update only their own profile
CREATE POLICY "users_update_own_data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow users to insert their own profile (for auth trigger)
CREATE POLICY "users_insert_own_profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());