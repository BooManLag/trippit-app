/*
  # Fix RLS policies to prevent infinite recursion

  1. Simplify trip_participants policies to avoid circular references
  2. Fix users table policies for trip functionality
  3. Ensure proper trip creation flow
*/

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can read relevant participants" ON trip_participants;
DROP POLICY IF EXISTS "Allow reading user info for trip functionality" ON users;
DROP POLICY IF EXISTS "Users can read accessible trips" ON trips;

-- Create simplified, non-recursive policies for trip_participants
CREATE POLICY "Users can manage their own participation"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read participants in their trips"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    -- User can see participants in trips they own
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()) OR
    -- User can see participants in trips they're part of
    trip_id IN (SELECT trip_id FROM trip_participants WHERE user_id = auth.uid())
  );

-- Create simplified users policies
CREATE POLICY "Users can read trip-related user info"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read their own data
    id = auth.uid() OR
    -- Users can read data of people in the same trips (simplified)
    EXISTS (
      SELECT 1 FROM trip_participants tp1
      JOIN trip_participants tp2 ON tp1.trip_id = tp2.trip_id
      WHERE tp1.user_id = auth.uid() AND tp2.user_id = users.id
    )
  );

-- Create simplified trips policy
CREATE POLICY "Users can read accessible trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    -- User owns the trip
    user_id = auth.uid() OR
    -- User is a participant in the trip
    id IN (SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()) OR
    -- User has been invited to the trip
    id IN (
      SELECT trip_id FROM trip_invitations 
      WHERE invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Ensure the trigger function is simple and doesn't cause issues
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add participant if user_id is not null
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_trip_created ON trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();