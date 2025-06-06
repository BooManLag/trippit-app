/*
  # Simple Bucket List System

  1. New Tables
    - `bucket_list_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `trip_id` (uuid, foreign key to trips)
      - `title` (text, the bucket list item title)
      - `description` (text, optional description)
      - `category` (text, category like Food, Culture, etc.)
      - `is_completed` (boolean, completion status)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `bucket_list_items` table
    - Add policy for users to manage their own bucket list items

  3. Changes
    - Remove dependency on external Reddit data
    - Simple user-managed bucket list system
*/

-- Create bucket_list_items table
CREATE TABLE IF NOT EXISTS bucket_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'Experience',
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE bucket_list_items ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can manage their bucket list items"
  ON bucket_list_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS bucket_list_items_user_trip_idx ON bucket_list_items(user_id, trip_id);
CREATE INDEX IF NOT EXISTS bucket_list_items_trip_idx ON bucket_list_items(trip_id);

-- Function to create default bucket list items for a trip
CREATE OR REPLACE FUNCTION create_default_bucket_list_items(p_user_id uuid, p_trip_id uuid, p_destination text)
RETURNS void AS $$
DECLARE
  city_name text;
  country_name text;
BEGIN
  -- Extract city and country from destination
  SELECT split_part(p_destination, ', ', 1) INTO city_name;
  SELECT split_part(p_destination, ', ', 2) INTO country_name;
  
  -- Insert default bucket list items
  INSERT INTO bucket_list_items (user_id, trip_id, title, description, category)
  VALUES
    (p_user_id, p_trip_id, 'Try local street food', 'Sample authentic local cuisine from street vendors', 'Food & Drink'),
    (p_user_id, p_trip_id, 'Visit a famous landmark', 'Take photos at the most iconic spot in ' || city_name, 'Sightseeing'),
    (p_user_id, p_trip_id, 'Learn basic local phrases', 'Master "hello", "thank you", and "where is the bathroom?"', 'Culture'),
    (p_user_id, p_trip_id, 'Take a walking tour', 'Explore the city on foot and discover hidden gems', 'Adventure'),
    (p_user_id, p_trip_id, 'Buy a meaningful souvenir', 'Find something special to remember your trip', 'Shopping'),
    (p_user_id, p_trip_id, 'Watch the sunrise or sunset', 'Find the perfect spot for golden hour photos', 'Experience'),
    (p_user_id, p_trip_id, 'Meet a local person', 'Have a genuine conversation with someone who lives there', 'Culture'),
    (p_user_id, p_trip_id, 'Try a new activity', 'Do something you''ve never done before', 'Adventure');
END;
$$ LANGUAGE plpgsql;