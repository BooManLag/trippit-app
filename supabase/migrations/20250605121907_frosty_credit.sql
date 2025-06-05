/*
  # Add trip_id to checklist_items

  1. Changes
    - Add trip_id column to checklist_items table
    - Add foreign key constraint to trips table
    - Add index on trip_id for better query performance

  2. Security
    - No changes to RLS policies needed
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'checklist_items' AND column_name = 'trip_id'
  ) THEN
    ALTER TABLE checklist_items ADD COLUMN trip_id uuid REFERENCES trips(id) ON DELETE CASCADE;
    CREATE INDEX checklist_items_trip_id_idx ON checklist_items(trip_id);
  END IF;
END $$;