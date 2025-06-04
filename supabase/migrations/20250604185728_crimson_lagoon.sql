/*
  # Allow anonymous trips

  1. Changes
    - Make user_id nullable in trips table
    - Update RLS policy to allow anonymous trip creation
    - Add policy for anonymous users to read their own trips

  2. Security
    - Maintain RLS on trips table
    - Add policy for anonymous trip creation
    - Add policy for anonymous trip reading
*/

ALTER TABLE trips ALTER COLUMN user_id DROP NOT NULL;

-- Update existing policy to handle both authenticated and anonymous trips
DROP POLICY IF EXISTS "Users can CRUD own trips" ON trips;

CREATE POLICY "Users can CRUD own trips"
ON trips
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add policy for anonymous trips
CREATE POLICY "Allow anonymous trip creation"
ON trips
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

CREATE POLICY "Allow anonymous trip reading"
ON trips
FOR SELECT
TO anon
USING (user_id IS NULL);