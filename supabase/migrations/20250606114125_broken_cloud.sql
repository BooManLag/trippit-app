/*
  # Create Bucket List System

  1. New Tables
    - `destination_bucket_items`: Store bucket list items for specific destinations
      - id (uuid, primary key)
      - destination (text)
      - city (text)
      - country (text)
      - title (text)
      - description (text)
      - category (text)
      - difficulty_level (text)
      - estimated_cost (text)
      - source (text)
      - reddit_url (text)
      - score (integer)
      - created_at (timestamptz)

    - `user_bucket_progress`: Track user progress on bucket list items
      - id (uuid, primary key)
      - user_id (uuid, references users)
      - trip_id (uuid, references trips)
      - bucket_item_id (uuid, references destination_bucket_items)
      - completed_at (timestamptz)
      - notes (text)
      - rating (integer)
      - created_at (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
    - Allow public reading of bucket items

  3. Functions
    - Function to generate bucket list items for destinations
*/

-- Create destination_bucket_items table
CREATE TABLE IF NOT EXISTS destination_bucket_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'Experience',
  difficulty_level text NOT NULL DEFAULT 'Easy',
  estimated_cost text NOT NULL DEFAULT 'Free',
  source text NOT NULL DEFAULT 'Community',
  reddit_url text DEFAULT '#',
  score integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS destination_bucket_items_destination_idx ON destination_bucket_items(destination);
CREATE INDEX IF NOT EXISTS destination_bucket_items_city_country_idx ON destination_bucket_items(city, country);

-- Enable RLS
ALTER TABLE destination_bucket_items ENABLE ROW LEVEL SECURITY;

-- Create policy for public reading
CREATE POLICY "Everyone can read bucket items"
  ON destination_bucket_items
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Create user_bucket_progress table
CREATE TABLE IF NOT EXISTS user_bucket_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  bucket_item_id uuid REFERENCES destination_bucket_items(id) ON DELETE CASCADE NOT NULL,
  completed_at timestamptz,
  notes text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT user_bucket_progress_unique UNIQUE (user_id, bucket_item_id)
);

-- Enable RLS
ALTER TABLE user_bucket_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for user progress
CREATE POLICY "Users can manage their bucket progress"
  ON user_bucket_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert some default bucket list items for popular destinations
INSERT INTO destination_bucket_items (destination, city, country, title, description, category, difficulty_level, estimated_cost) VALUES
  ('Paris, France', 'Paris', 'France', 'Watch sunrise from Montmartre', 'Experience the magical sunrise over Paris from the steps of Sacré-Cœur', 'Sightseeing', 'Easy', 'Free'),
  ('Paris, France', 'Paris', 'France', 'Picnic by the Seine', 'Grab fresh bread, cheese, and wine for a perfect Parisian picnic along the river', 'Food & Drink', 'Easy', 'Budget'),
  ('Paris, France', 'Paris', 'France', 'Visit a hidden speakeasy', 'Discover one of Paris''s secret cocktail bars in the Marais district', 'Nightlife', 'Medium', 'Expensive'),
  ('Paris, France', 'Paris', 'France', 'Take a cooking class', 'Learn to make authentic French pastries from a local chef', 'Food & Drink', 'Medium', 'Expensive'),
  
  ('Tokyo, Japan', 'Tokyo', 'Japan', 'Experience Tsukiji Fish Market', 'Wake up early to witness the famous tuna auctions and enjoy fresh sushi breakfast', 'Food & Drink', 'Easy', 'Budget'),
  ('Tokyo, Japan', 'Tokyo', 'Japan', 'Stay in a capsule hotel', 'Experience Japan''s unique capsule hotel culture for one night', 'Accommodation', 'Easy', 'Budget'),
  ('Tokyo, Japan', 'Tokyo', 'Japan', 'Attend a sumo wrestling match', 'Watch traditional sumo wrestling at Ryogoku Kokugikan', 'Culture', 'Medium', 'Expensive'),
  ('Tokyo, Japan', 'Tokyo', 'Japan', 'Karaoke all night', 'Sing your heart out at a traditional Japanese karaoke box', 'Nightlife', 'Easy', 'Budget'),
  
  ('New York, United States', 'New York', 'United States', 'Walk across Brooklyn Bridge at sunset', 'Experience the iconic bridge with stunning Manhattan skyline views', 'Sightseeing', 'Easy', 'Free'),
  ('New York, United States', 'New York', 'United States', 'Eat pizza from a street vendor', 'Try authentic New York pizza from a classic street cart', 'Food & Drink', 'Easy', 'Budget'),
  ('New York, United States', 'New York', 'United States', 'See a Broadway show', 'Experience world-class theater in the heart of Times Square', 'Culture', 'Medium', 'Expensive'),
  ('New York, United States', 'New York', 'United States', 'Visit Central Park in fall', 'Walk through the park during peak autumn foliage season', 'Sightseeing', 'Easy', 'Free'),
  
  ('Rome, Italy', 'Rome', 'Italy', 'Throw coin in Trevi Fountain', 'Make a wish and ensure your return to the Eternal City', 'Culture', 'Easy', 'Free'),
  ('Rome, Italy', 'Rome', 'Italy', 'Take a food tour in Trastevere', 'Explore authentic Roman cuisine in this charming neighborhood', 'Food & Drink', 'Easy', 'Budget'),
  ('Rome, Italy', 'Rome', 'Italy', 'Climb St. Peter''s Dome', 'Ascend to the top of St. Peter''s Basilica for panoramic city views', 'Sightseeing', 'Hard', 'Budget'),
  ('Rome, Italy', 'Rome', 'Italy', 'Attend a gladiator show', 'Watch a historical reenactment near the Colosseum', 'Culture', 'Easy', 'Budget');