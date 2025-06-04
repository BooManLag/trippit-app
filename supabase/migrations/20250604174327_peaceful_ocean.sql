/*
  # Initial Database Schema

  1. New Tables
    - users: Store user information
    - trips: Store trip details
    - badges: Available achievement badges
    - user_badges: Track earned badges
    - stories: User travel stories
    - tips: Travel tips
    - bucket_list: Global bucket list items
    - user_bucket_items: User's bucket list progress

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  display_name text,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  destination text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT trips_dates_check CHECK (end_date >= start_date)
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own trips"
  ON trips
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  emoji text NOT NULL
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read badges"
  ON badges
  FOR SELECT
  TO authenticated
  USING (true);

-- Create user_badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  badge_id uuid REFERENCES badges(id) ON DELETE CASCADE NOT NULL,
  earned_at timestamptz DEFAULT now(),

  CONSTRAINT user_badges_unique UNIQUE (user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own badges"
  ON user_badges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create stories table
CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  city text NOT NULL,
  country text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all stories"
  ON stories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create stories"
  ON stories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stories"
  ON stories
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create tips table
CREATE TABLE IF NOT EXISTS tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read tips"
  ON tips
  FOR SELECT
  TO authenticated
  USING (true);

-- Create bucket_list table
CREATE TABLE IF NOT EXISTS bucket_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  task text NOT NULL,
  source text,
  badge_id uuid REFERENCES badges(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bucket_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read bucket list"
  ON bucket_list
  FOR SELECT
  TO authenticated
  USING (true);

-- Create user_bucket_items table
CREATE TABLE IF NOT EXISTS user_bucket_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  bucket_list_id uuid REFERENCES bucket_list(id) ON DELETE CASCADE NOT NULL,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT user_bucket_items_unique UNIQUE (user_id, bucket_list_id)
);

ALTER TABLE user_bucket_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own bucket items"
  ON user_bucket_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert initial badges
INSERT INTO badges (name, description, emoji) VALUES
  ('First Timer', 'Created your first trip', '🌟'),
  ('Globetrotter', 'Visited 5 different countries', '🌍'),
  ('Story Teller', 'Shared your first travel story', '📝'),
  ('Bucket List Pro', 'Completed 10 bucket list items', '✅'),
  ('Tip Master', 'Contributed 5 travel tips', '💡');

-- Insert initial tips
INSERT INTO tips (category, title, content) VALUES
  ('Safety', 'Keep Documents Safe', 'Always keep a digital copy of your passport and important documents in cloud storage.'),
  ('Budget', 'Currency Exchange Tips', 'Use local ATMs instead of airport currency exchanges for better rates.'),
  ('Culture', 'Research Local Customs', 'Learn basic cultural norms and taboos before visiting a new country.'),
  ('Food', 'Street Food Safety', 'Look for street food stalls with long local queues - they''re usually both safe and delicious.'),
  ('Transport', 'Public Transport Apps', 'Download local public transport apps before your trip for easier navigation.');

-- Insert initial bucket list items
INSERT INTO bucket_list (city, task, source) VALUES
  ('Paris', 'Watch the sunrise from Montmartre', 'Community'),
  ('Tokyo', 'Experience the Tsukiji Fish Market', 'Community'),
  ('New York', 'Walk across the Brooklyn Bridge at sunset', 'Community'),
  ('Rome', 'Throw a coin in the Trevi Fountain', 'Community'),
  ('Sydney', 'Climb the Harbour Bridge', 'Community');