/*
  # Initial Database Schema

  1. New Tables
    - users: Store user information
    - trips: Store trip details with participant support
    - checklist_items: User checklist items
    - bucket_list: Global bucket list items
    - user_bucket_items: User's bucket list progress
    - user_bucket_progress: Detailed bucket progress tracking
    - destination_bucket_items: Location-specific bucket items
    - stories: User travel stories
    - tips: Travel tips
    - tokens: API tokens for edge functions

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

-- Add foreign key constraint to auth.users
ALTER TABLE users
  ADD CONSTRAINT users_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Create trips table with participant support
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  destination text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  max_participants integer DEFAULT 2 CHECK (max_participants >= 1 AND max_participants <= 20),
  participant_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),

  CONSTRAINT trips_dates_check CHECK (end_date >= start_date)
);

-- Create trip_participants table for detailed participant data
CREATE TABLE IF NOT EXISTS trip_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'participant' CHECK (role IN ('owner', 'participant')),
  joined_at timestamptz DEFAULT now(),
  
  UNIQUE(trip_id, user_id)
);

-- Create trip_invitations table with secure tokens
CREATE TABLE IF NOT EXISTS trip_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email text NOT NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  
  UNIQUE(trip_id, invitee_email)
);

-- Create checklist_items table
CREATE TABLE IF NOT EXISTS checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL,
  description text NOT NULL,
  is_completed boolean DEFAULT false,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  
  UNIQUE(user_id, trip_id, description)
);

-- Create bucket_list_items table
CREATE TABLE IF NOT EXISTS bucket_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT 'Experience',
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create user_bucket_progress table
CREATE TABLE IF NOT EXISTS user_bucket_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
  bucket_item_id text NOT NULL,
  completed_at timestamptz,
  notes text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, bucket_item_id)
);

-- Create destination_bucket_items table
CREATE TABLE IF NOT EXISTS destination_bucket_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text DEFAULT 'Experience',
  difficulty_level text DEFAULT 'Easy',
  estimated_cost text DEFAULT 'Free',
  source text DEFAULT 'Community',
  reddit_url text DEFAULT '#',
  score integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

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

-- Create tips table
CREATE TABLE IF NOT EXISTS tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create bucket_list table
CREATE TABLE IF NOT EXISTS bucket_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  task text NOT NULL,
  source text,
  badge_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Create user_bucket_items table
CREATE TABLE IF NOT EXISTS user_bucket_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bucket_list_id uuid NOT NULL REFERENCES bucket_list(id) ON DELETE CASCADE,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),

  UNIQUE(user_id, bucket_list_id)
);

-- Create tokens table for edge functions
CREATE TABLE IF NOT EXISTS tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_participant_ids ON trips USING GIN (participant_ids);
CREATE INDEX IF NOT EXISTS trip_participants_trip_id_idx ON trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS trip_participants_user_id_idx ON trip_participants(user_id);
CREATE INDEX IF NOT EXISTS trip_invitations_token_idx ON trip_invitations(token);
CREATE INDEX IF NOT EXISTS trip_invitations_trip_id_idx ON trip_invitations(trip_id);
CREATE INDEX IF NOT EXISTS trip_invitations_invitee_email_idx ON trip_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS checklist_items_trip_id_idx ON checklist_items(trip_id);
CREATE INDEX IF NOT EXISTS checklist_items_user_trip_description_idx ON checklist_items(user_id, trip_id, description);
CREATE INDEX IF NOT EXISTS bucket_list_items_trip_idx ON bucket_list_items(trip_id);
CREATE INDEX IF NOT EXISTS bucket_list_items_user_trip_idx ON bucket_list_items(user_id, trip_id);
CREATE INDEX IF NOT EXISTS destination_bucket_items_destination_idx ON destination_bucket_items(destination);
CREATE INDEX IF NOT EXISTS destination_bucket_items_city_country_idx ON destination_bucket_items(city, country);
CREATE INDEX IF NOT EXISTS tokens_expires_at_idx ON tokens(expires_at);
CREATE INDEX IF NOT EXISTS tokens_service_idx ON tokens(service);

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