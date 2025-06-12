/*
  # Fix trip creation issues

  1. Ensure proper RLS policies for trip creation
  2. Fix any constraint issues
  3. Ensure trigger function works correctly
*/

-- Ensure the trigger function exists and works correctly
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add participant if user_id is not null
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_trip_created ON trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();

-- Ensure proper RLS policies for trips table
DROP POLICY IF EXISTS "Allow anonymous trip creation" ON trips;
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

-- Ensure the trips table has proper constraints
DO $$
BEGIN
  -- Check if the constraint exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trips_dates_check' 
    AND table_name = 'trips'
  ) THEN
    ALTER TABLE trips ADD CONSTRAINT trips_dates_check CHECK (end_date >= start_date);
  END IF;
  
  -- Check if max_participants constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trips_max_participants_check' 
    AND table_name = 'trips'
  ) THEN
    ALTER TABLE trips ADD CONSTRAINT trips_max_participants_check 
    CHECK (max_participants >= 1 AND max_participants <= 20);
  END IF;
END $$;