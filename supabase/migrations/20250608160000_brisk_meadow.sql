/*
  # Enforce unique checklist items per trip

  1. Changes
    - Add unique index on (user_id, trip_id, description) to checklist_items
      to prevent duplicate entries when creating or revisiting a checklist

  2. Security
    - No changes to RLS policies
*/

CREATE UNIQUE INDEX IF NOT EXISTS checklist_items_user_trip_description_idx
  ON checklist_items(user_id, trip_id, description);
