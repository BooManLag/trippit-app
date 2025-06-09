/*
  # Add max_participants column to trips table

  1. Changes
    - Add max_participants column to trips table with default value of 2
    - This allows users to set how many people they plan to invite when creating a trip

  2. Security
    - No changes to RLS policies needed
*/

-- Add max_participants column to trips table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'max_participants'
  ) THEN
    ALTER TABLE trips ADD COLUMN max_participants integer DEFAULT 2 CHECK (max_participants >= 1 AND max_participants <= 20);
  END IF;
END $$;