/*
  # Fix trip participants RLS policies

  1. Policy Updates
    - Remove problematic recursive policy on trip_participants
    - Add simpler, non-recursive policies for trip_participants
    - Ensure trip owners can manage participants
    - Allow users to view participants of trips they're part of
    - Allow users to join trips (insert themselves)

  2. Function
    - Create function to automatically add trip creator as owner
    - Add trigger to call this function when trip is created
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Trip owners can manage participants" ON trip_participants;
DROP POLICY IF EXISTS "Users can view trip participants for trips they're part of" ON trip_participants;
DROP POLICY IF EXISTS "Users can join trips" ON trip_participants;

-- Create new, simpler policies that avoid recursion
CREATE POLICY "Users can insert themselves as participants"
  ON trip_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view participants of their trips"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
    OR
    user_id = auth.uid()
  );

CREATE POLICY "Trip owners can manage all participants"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

-- Create function to add trip owner as participant
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add if user_id is not null (authenticated user created the trip)
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically add trip creator as owner
DROP TRIGGER IF EXISTS on_trip_created ON trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();