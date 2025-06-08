/*
  # Fix checklist items unique constraint

  1. Remove duplicate checklist items
    - Keep the oldest entry for each (user_id, trip_id, description) combination
    - Delete newer duplicates based on created_at timestamp
  
  2. Create unique index
    - Prevent future duplicates on (user_id, trip_id, description)
    - Ensures data integrity for checklist items
*/

-- Remove duplicate checklist items, keeping only the oldest entry for each combination
DELETE FROM checklist_items 
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, trip_id, description 
             ORDER BY created_at ASC
           ) as rn
    FROM checklist_items
  ) ranked
  WHERE rn > 1
);

-- Now create the unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS checklist_items_user_trip_description_idx
  ON checklist_items(user_id, trip_id, description);