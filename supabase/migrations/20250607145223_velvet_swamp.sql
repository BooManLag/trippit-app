/*
  # Fix bucket_item_id column type

  1. Changes
    - Change bucket_item_id from uuid to text to support Reddit-generated string IDs
    - Update constraints to work with text type
    - Remove foreign key constraint since bucket items are dynamically generated

  2. Security
    - Maintain existing RLS policies
*/

-- Drop the existing foreign key constraint
ALTER TABLE user_bucket_progress DROP CONSTRAINT IF EXISTS user_bucket_progress_bucket_item_id_fkey;

-- Drop the existing unique constraint (this will automatically drop the associated index)
ALTER TABLE user_bucket_progress DROP CONSTRAINT IF EXISTS user_bucket_progress_unique;

-- Change the column type from uuid to text
ALTER TABLE user_bucket_progress ALTER COLUMN bucket_item_id TYPE text;

-- Recreate the unique constraint with the new text type (this will automatically create the index)
ALTER TABLE user_bucket_progress ADD CONSTRAINT user_bucket_progress_unique UNIQUE (user_id, bucket_item_id);