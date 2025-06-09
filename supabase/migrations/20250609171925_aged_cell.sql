/*
  # Fix users table foreign key constraint

  This migration fixes the infinite recursion issue in trip_participants policies
  by correcting the users table foreign key constraint.

  ## Changes
  1. Drop the incorrect self-referencing foreign key constraint on users.id
  2. Add the correct foreign key constraint referencing auth.users.id
  3. Ensure proper RLS policies are in place

  ## Security
  - Maintains existing RLS policies
  - Ensures users table properly references auth.users
*/

-- Drop the incorrect self-referencing foreign key constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_id_fkey' 
    AND table_name = 'users' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_id_fkey;
  END IF;
END $$;

-- Add the correct foreign key constraint to auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_id_fkey' 
    AND table_name = 'users' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.users 
    ADD CONSTRAINT users_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure the users table has proper RLS policies (these should already exist but let's make sure)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Auth service can insert users" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;

CREATE POLICY "Auth service can insert users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);