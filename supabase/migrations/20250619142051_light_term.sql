/*
  # Fix User Existence Check with Profiles Table

  1. Changes
    - Update users table to serve as profiles table
    - Add proper RLS policies for public read access
    - Update trigger to ensure all auth users get profiles
    - Fix user existence checking

  2. Security
    - Enable public read access to basic user info (id, email, display_name)
    - Maintain user privacy while allowing invitation functionality
*/

-- Ensure users table has proper structure for profiles
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "users_own_data" ON public.users;
DROP POLICY IF EXISTS "users_invitation_read" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Auth service can insert users" ON public.users;

-- Create new policies that allow checking user existence
-- Allow anyone (authenticated users) to read basic user info for invitation purposes
CREATE POLICY "public_read_for_invitations"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own data
CREATE POLICY "users_update_own_data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users can insert their own profile (for auth trigger)
CREATE POLICY "users_insert_own_profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Update the trigger function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
SET search_path = public
AS $$
BEGIN
  -- Insert user profile, handling conflicts gracefully
  INSERT INTO public.users (id, email, display_name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, users.display_name);
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.users TO anon, authenticated;
GRANT INSERT, UPDATE ON public.users TO authenticated;