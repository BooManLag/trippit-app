/*
  # Fix Users Table RLS Permissions

  1. Changes
    - Ensure RLS is enabled on users table
    - Drop any conflicting policies
    - Create simple policy allowing authenticated users to read all user data
    - Grant necessary permissions

  2. Security
    - Allow authenticated users to read user profiles (needed for invitation system)
    - Users can only modify their own data
*/

-- 1. Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 2. Grant necessary permissions to authenticated role
GRANT SELECT ON public.users TO authenticated;

-- 3. Drop any existing conflicting policies
DROP POLICY IF EXISTS authenticated_can_read_users ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Auth service can insert users" ON public.users;
DROP POLICY IF EXISTS users_own_data ON public.users;
DROP POLICY IF EXISTS users_invitation_read ON public.users;
DROP POLICY IF EXISTS users_trip_context_read ON public.users;
DROP POLICY IF EXISTS public_read_for_invitations ON public.users;
DROP POLICY IF EXISTS users_update_own_data ON public.users;
DROP POLICY IF EXISTS users_insert_own_profile ON public.users;
DROP POLICY IF EXISTS "Users can read inviter profiles" ON public.users;

-- 4. Create a simple policy allowing any authenticated user to SELECT any row
CREATE POLICY authenticated_can_read_users
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. Allow users to update only their own data
CREATE POLICY users_update_own_data
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 6. Allow users to insert their own profile (for auth trigger)
CREATE POLICY users_insert_own_profile
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());