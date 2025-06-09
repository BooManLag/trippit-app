/*
  # Fix trip owner participation trigger

  1. Updated Trigger Function
    - Ensures trip creator is automatically added as owner participant
    - Handles the case where user_id might be null (anonymous trips)
    - Prevents duplicate entries

  2. Security
    - Uses proper error handling
    - Maintains data integrity
*/

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_trip_created ON trips;
DROP FUNCTION IF EXISTS add_trip_owner_as_participant();

-- Create improved trigger function
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only add participant if trip has a user_id (not anonymous)
  IF NEW.user_id IS NOT NULL THEN
    -- Insert the trip owner as a participant with 'owner' role
    INSERT INTO trip_participants (trip_id, user_id, role, joined_at)
    VALUES (NEW.id, NEW.user_id, 'owner', now())
    ON CONFLICT (trip_id, user_id) DO NOTHING; -- Prevent duplicates
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();