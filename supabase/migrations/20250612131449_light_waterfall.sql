/*
  # Fix user profile creation and trip creation issues

  1. Security
    - Ensure proper RLS policies for user creation
    - Fix trigger function for trip participant creation
    - Add better error handling

  2. Changes
    - Update users table policies
    - Fix trip creation trigger
    - Ensure proper constraints
*/

-- Ensure users table has proper RLS policies
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Allow users to insert their own profile data
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure the trigger function for adding trip owner as participant works correctly
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add participant if user_id is not null
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (trip_id, user_id) DO NOTHING; -- Prevent duplicate entries
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_trip_created ON trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();

-- Ensure proper RLS policies for trips table
DROP POLICY IF EXISTS "Users can create trips" ON trips;
CREATE POLICY "Users can create trips"
  ON trips
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Ensure proper RLS policies for trip_participants table
DROP POLICY IF EXISTS "Users can be added as participants" ON trip_participants;
CREATE POLICY "Users can be added as participants"
  ON trip_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Allow any authenticated user to be added as participant

-- Add a policy to allow reading user info for trip functionality
DROP POLICY IF EXISTS "Allow reading user info for trip functionality" ON users;
CREATE POLICY "Allow reading user info for trip functionality"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read their own data
    id = auth.uid() OR
    -- Users can read data of people who invited them
    id IN (
      SELECT inviter_id FROM trip_invitations 
      WHERE invitee_email IN (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    ) OR
    -- Users can read data of people in their trips
    id IN (
      SELECT tp.user_id FROM trip_participants tp
      WHERE tp.trip_id IN (
        SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
      )
    ) OR
    -- Users can read data of people in trips they own
    id IN (
      SELECT tp.user_id FROM trip_participants tp
      JOIN trips t ON tp.trip_id = t.id
      WHERE t.user_id = auth.uid()
    )
  );

-- Ensure email validation constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_email_check' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_check 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;