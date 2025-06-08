/*
  # Fix bucket_item_id column type in user_bucket_progress table

  1. Changes
    - Change `bucket_item_id` column type from `uuid` to `text` in `user_bucket_progress` table
    - Update the unique constraint to work with text type
    - Remove the foreign key constraint since bucket items are not stored in a separate table

  2. Security
    - Maintain existing RLS policies
    - No changes to security model

  This fixes the error where string-based bucket item IDs (like "reddit_1kn8nt7_0") 
  cannot be stored in a UUID column.
*/

-- Drop the existing foreign key constraint
ALTER TABLE user_bucket_progress DROP CONSTRAINT IF EXISTS user_bucket_progress_bucket_item_id_fkey;

-- Drop the existing unique constraint
ALTER TABLE user_bucket_progress DROP CONSTRAINT IF EXISTS user_bucket_progress_unique;

-- Change the column type from uuid to text
ALTER TABLE user_bucket_progress ALTER COLUMN bucket_item_id TYPE text;

-- Recreate the unique constraint with the new text type
ALTER TABLE user_bucket_progress ADD CONSTRAINT user_bucket_progress_unique UNIQUE (user_id, bucket_item_id);

-- Update the index to work with text type
DROP INDEX IF EXISTS user_bucket_progress_unique;
CREATE UNIQUE INDEX user_bucket_progress_unique ON user_bucket_progress USING btree (user_id, bucket_item_id);