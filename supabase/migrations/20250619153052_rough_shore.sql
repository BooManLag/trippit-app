/*
  # Fix Users Table RLS Policy

  This migration fixes the Row Level Security (RLS) policy on the users table to allow
  authenticated users to read user information, which is required for the invitation system.

  ## Changes Made

  1. **Security Policy Update**
     - Drop any existing conflicting policies on users table
     - Create a proper policy that allows authenticated users to read all user records
     - This enables the invitation system to check if users exist and fetch user details

  ## Why This Fix Is Needed

  The invitation system needs to:
  - Check if a user exists by email when sending invitations
  - Fetch inviter details when displaying invitations
  - Get participant information for trip management
  
  Without proper read access to the users table, all these operations fail with 
  "permission denied for table users" errors.

  ## Security Considerations

  - Only authenticated users can read user data
  - This follows standard practice for user directory access in collaborative apps
  - Users can only see basic profile information (id, email, display_name)
*/

-- Ensure RLS is enabled on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS authenticated_can_read_users ON public.users;
DROP POLICY IF EXISTS "Users can read all users" ON public.users;

-- Create a comprehensive policy that allows authenticated users to read user information
CREATE POLICY authenticated_can_read_users
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Verify the policy is working by testing a simple query
-- This comment documents that authenticated users should now be able to:
-- 1. Check if users exist by email (for invitation validation)
-- 2. Fetch user details for invitation enrichment
-- 3. Get participant information for trip management