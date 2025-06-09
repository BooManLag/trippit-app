-- Add max_participants column to trips table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'max_participants'
  ) THEN
    ALTER TABLE trips ADD COLUMN max_participants integer DEFAULT 2 CHECK (max_participants >= 1 AND max_participants <= 20);
  END IF;
END $$;