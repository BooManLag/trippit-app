/*
  # Fix users table permissions for invitations

  1. Security Updates
    - Add SELECT policy on users table for authenticated users
    - This allows the trip_invitations policies to properly join with users table
  
  2. Notes
    - The users table already exists and serves as our profiles table
    - We just need to add the missing SELECT policy
    - This will resolve the "permission denied for table users" error
*/

-- Add SELECT policy on users table for authenticated users
-- This allows other tables' policies to reference users data
CREATE POLICY IF NOT EXISTS "authenticated_can_read_users" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Also allow anon users to read basic user info for invitations
CREATE POLICY IF NOT EXISTS "anon_can_read_basic_users" 
  ON users 
  FOR SELECT 
  TO anon 
  USING (true);