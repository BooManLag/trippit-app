/*
  # Fix users table for Supabase Auth

  1. Changes
    - Update users table to use auth.uid() for id default
    - Add proper foreign key constraint to auth.users
    - Update RLS policies to use auth.uid()

  2. Security
    - Maintain existing RLS policies
    - Ensure proper auth service access
*/

-- Drop existing constraints and defaults
ALTER TABLE users 
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DEFAULT auth.uid();

-- Add foreign key constraint to auth.users
ALTER TABLE users
  ADD CONSTRAINT users_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Update RLS policies to use auth.uid()
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add insert policy for auth service
CREATE POLICY "Auth service can insert users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);