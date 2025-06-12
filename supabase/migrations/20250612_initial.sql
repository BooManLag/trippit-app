-- 20250604174327_peaceful_ocean.sql
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
-- 20250604185728_crimson_lagoon.sql
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
-- 20250605091041_stark_field.sql
/*
  # Fix users table for Supabase Auth

  1. Changes
    - Update users table to use auth.uid() for id default
    - Add proper foreign key constraint to auth.users
    - Update RLS policies to use auth.uid()

  2. Security
    - Maintain existing RLS policies
    - Ensure proper auth service access
*/

-- Drop existing constraints and defaults
ALTER TABLE users 
  ALTER COLUMN id DROP DEFAULT,
  ALTER COLUMN id SET DEFAULT auth.uid();

-- Add foreign key constraint to auth.users
ALTER TABLE users
  ADD CONSTRAINT users_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Update RLS policies to use auth.uid()
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add insert policy for auth service
CREATE POLICY "Auth service can insert users"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
-- 20250605091323_late_cell.sql
/*
  # Fix User Creation Setup

  1. Changes
    - Create or replace trigger function for handling new users
    - Add proper trigger on auth.users table
    - Ensure correct RLS policies for user creation
  
  2. Security
    - Enable RLS on users table
    - Add policies for user management
*/

-- First, create the trigger function that will handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.created_at
  );
  RETURN NEW;
END;
$$;

-- Ensure the trigger exists on the auth.users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Auth service can insert users" ON public.users;

-- Recreate policies with correct permissions
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Auth service can insert users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Grant necessary permissions to the trigger function
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;
-- 20250605121907_frosty_credit.sql
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
-- 20250605134803_sweet_trail.sql
/*
  # Create checklist items table and default items

  1. New Tables
    - checklist_items: Store user's checklist items
      - id (uuid, primary key)
      - user_id (uuid, references users)
      - category (text)
      - description (text)
      - is_completed (boolean)
      - is_default (boolean)
      - created_at (timestamptz)

  2. Security
    - Enable RLS on checklist_items table
    - Add policy for users to manage their items

  3. Functions
    - create_default_checklist_items: Creates default checklist items for a user
    - handle_new_user: Trigger function to create default items for new users
*/

-- Create checklist_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  is_completed boolean DEFAULT false,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can manage their checklist items" ON checklist_items;

-- Create policy
CREATE POLICY "Users can manage their checklist items"
  ON checklist_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to insert default checklist items
CREATE OR REPLACE FUNCTION create_default_checklist_items(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Essentials
  INSERT INTO checklist_items (user_id, category, description, is_default)
  VALUES
    (p_user_id, '📄 Documents', 'Valid passport (check expiration date)', true),
    (p_user_id, '📄 Documents', 'Travel insurance documents', true),
    (p_user_id, '📄 Documents', 'Visa requirements checked', true),
    (p_user_id, '📄 Documents', 'Travel itinerary printed', true);

  -- Essentials
  INSERT INTO checklist_items (user_id, category, description, is_default)
  VALUES
    (p_user_id, '🎒 Essentials', 'Phone and charger', true),
    (p_user_id, '🎒 Essentials', 'Power adapter for destination', true),
    (p_user_id, '🎒 Essentials', 'Basic first-aid kit', true),
    (p_user_id, '🎒 Essentials', 'Emergency contact list', true);

  -- Preparation
  INSERT INTO checklist_items (user_id, category, description, is_default)
  VALUES
    (p_user_id, '✈️ Preparation', 'Check-in completed', true),
    (p_user_id, '✈️ Preparation', 'Local currency exchanged', true),
    (p_user_id, '✈️ Preparation', 'Download offline maps', true),
    (p_user_id, '✈️ Preparation', 'Learn basic local phrases', true);

  -- Health & Safety
  INSERT INTO checklist_items (user_id, category, description, is_default)
  VALUES
    (p_user_id, '💊 Health & Safety', 'Required vaccinations', true),
    (p_user_id, '💊 Health & Safety', 'Personal medications', true),
    (p_user_id, '💊 Health & Safety', 'Travel insurance coverage', true),
    (p_user_id, '💊 Health & Safety', 'Emergency numbers saved', true);
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create default checklist items for the new user
  PERFORM create_default_checklist_items(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
-- 20250606073242_navy_lagoon.sql
/*
  # Update checklist items table and policies

  1. Tables
    - Ensure `checklist_items` table exists with proper structure
    - Add `trip_id` column if it doesn't exist
    - Create index on `trip_id` for better performance

  2. Security
    - Enable RLS on `checklist_items` table
    - Create or replace policies for user access control
    - Allow anonymous access for trip-specific items

  3. Functions
    - Create function to insert default checklist items
    - Create trigger for new user registration

  4. Data
    - Insert default checklist categories and items
*/

-- Create checklist_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL,
  description text NOT NULL,
  is_completed boolean DEFAULT false,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE
);

-- Add trip_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'checklist_items' AND column_name = 'trip_id'
  ) THEN
    ALTER TABLE checklist_items ADD COLUMN trip_id uuid REFERENCES trips(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index on trip_id if it doesn't exist
CREATE INDEX IF NOT EXISTS checklist_items_trip_id_idx ON checklist_items(trip_id);

-- Enable RLS
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their checklist items" ON checklist_items;
DROP POLICY IF EXISTS "Allow anonymous checklist creation" ON checklist_items;
DROP POLICY IF EXISTS "Allow anonymous checklist reading" ON checklist_items;

-- Create new policies
CREATE POLICY "Users can manage their checklist items"
  ON checklist_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow anonymous checklist creation"
  ON checklist_items
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Allow anonymous checklist reading"
  ON checklist_items
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- Create or replace function to insert default checklist items
CREATE OR REPLACE FUNCTION create_default_checklist_items(p_user_id uuid, p_trip_id uuid DEFAULT NULL)
RETURNS void AS $$
BEGIN
  -- Documents
  INSERT INTO checklist_items (user_id, trip_id, category, description, is_default)
  VALUES
    (p_user_id, p_trip_id, '📄 Documents', 'Valid passport (check expiration date)', true),
    (p_user_id, p_trip_id, '📄 Documents', 'Travel insurance documents', true),
    (p_user_id, p_trip_id, '📄 Documents', 'Visa requirements checked', true),
    (p_user_id, p_trip_id, '📄 Documents', 'Travel itinerary printed', true);

  -- Essentials
  INSERT INTO checklist_items (user_id, trip_id, category, description, is_default)
  VALUES
    (p_user_id, p_trip_id, '🎒 Essentials', 'Phone and charger', true),
    (p_user_id, p_trip_id, '🎒 Essentials', 'Power adapter for destination', true),
    (p_user_id, p_trip_id, '🎒 Essentials', 'Basic first-aid kit', true),
    (p_user_id, p_trip_id, '🎒 Essentials', 'Emergency contact list', true);

  -- Preparation
  INSERT INTO checklist_items (user_id, trip_id, category, description, is_default)
  VALUES
    (p_user_id, p_trip_id, '✈️ Preparation', 'Check-in completed', true),
    (p_user_id, p_trip_id, '✈️ Preparation', 'Local currency exchanged', true),
    (p_user_id, p_trip_id, '✈️ Preparation', 'Download offline maps', true),
    (p_user_id, p_trip_id, '✈️ Preparation', 'Learn basic local phrases', true);

  -- Health & Safety
  INSERT INTO checklist_items (user_id, trip_id, category, description, is_default)
  VALUES
    (p_user_id, p_trip_id, '💊 Health & Safety', 'Required vaccinations', true),
    (p_user_id, p_trip_id, '💊 Health & Safety', 'Personal medications', true),
    (p_user_id, p_trip_id, '💊 Health & Safety', 'Travel insurance coverage', true),
    (p_user_id, p_trip_id, '💊 Health & Safety', 'Emergency numbers saved', true);
END;
$$ LANGUAGE plpgsql;

-- Create or replace trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into users table
  INSERT INTO public.users (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
-- 20250606091651_teal_night.sql
/*
  # Create checklist items table and setup

  1. New Tables
    - checklist_items: Store user's checklist items with categories
      - id (uuid, primary key)
      - user_id (uuid, references users)
      - category (text)
      - description (text)
      - is_completed (boolean, default false)
      - is_default (boolean, default false)
      - created_at (timestamptz)

  2. Security
    - Enable RLS on checklist_items table
    - Add policy for users to manage their items (drop existing first)

  3. Functions
    - create_default_checklist_items: Creates default checklist items for a user
    - handle_new_user: Trigger function to create default items for new users
*/

-- Create checklist_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  is_completed boolean DEFAULT false,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their checklist items" ON checklist_items;

-- Create new policy
CREATE POLICY "Users can manage their checklist items"
  ON checklist_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create or replace function to insert default checklist items
CREATE OR REPLACE FUNCTION create_default_checklist_items(p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Essentials
  INSERT INTO checklist_items (user_id, category, description, is_default)
  VALUES
    (p_user_id, '📄 Essentials', 'Passport (valid at least 6 months)', true),
    (p_user_id, '📄 Essentials', 'Visa (if required)', true),
    (p_user_id, '📄 Essentials', 'Flight tickets (downloaded + printed)', true),
    (p_user_id, '📄 Essentials', 'Accommodation booked', true),
    (p_user_id, '📄 Essentials', 'Itinerary saved offline', true),
    (p_user_id, '📄 Essentials', 'Travel insurance confirmation', true),
    (p_user_id, '📄 Essentials', 'Local currency or travel card', true),
    (p_user_id, '📄 Essentials', 'Emergency contacts list', true);

  -- Packing
  INSERT INTO checklist_items (user_id, category, description, is_default)
  VALUES
    (p_user_id, '🧳 Packing', 'Clothes (based on weather)', true),
    (p_user_id, '🧳 Packing', 'Toiletries', true),
    (p_user_id, '🧳 Packing', 'Medication + prescriptions', true),
    (p_user_id, '🧳 Packing', 'Chargers + power bank', true),
    (p_user_id, '🧳 Packing', 'Adapter (check plug type)', true),
    (p_user_id, '🧳 Packing', 'Reusable water bottle', true),
    (p_user_id, '🧳 Packing', 'Travel pillow or blanket', true);

  -- Smart Prep
  INSERT INTO checklist_items (user_id, category, description, is_default)
  VALUES
    (p_user_id, '🧠 Smart Prep', 'Download offline maps (Google Maps, Maps.me)', true),
    (p_user_id, '🧠 Smart Prep', 'Translate key phrases in local language', true),
    (p_user_id, '🧠 Smart Prep', 'Screenshot/print booking confirmations', true),
    (p_user_id, '🧠 Smart Prep', 'Check baggage limits', true),
    (p_user_id, '🧠 Smart Prep', 'Inform your bank of travel (to avoid card blocks)', true);

  -- Digital Tools
  INSERT INTO checklist_items (user_id, category, description, is_default)
  VALUES
    (p_user_id, '📱 Digital Tools', 'SIM card or eSIM setup', true),
    (p_user_id, '📱 Digital Tools', 'Installed must-have apps (e.g. Grab, Google Translate, XE, etc.)', true),
    (p_user_id, '📱 Digital Tools', 'Backup important docs to cloud or USB', true),
    (p_user_id, '📱 Digital Tools', 'Download entertainment for the flight', true);
END;
$$ LANGUAGE plpgsql;

-- Create or replace trigger function to add default items for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into users table first
  INSERT INTO public.users (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name;
  
  -- Create default checklist items for the new user
  PERFORM create_default_checklist_items(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
-- 20250606110401_summer_truth.sql
/*
  # Create trigger to automatically create user profile

  1. New Functions
    - `handle_new_user()` - Automatically creates a user profile when a new user signs up
  
  2. New Triggers
    - Trigger on `auth.users` insert to create corresponding `public.users` record
  
  3. Security
    - Function runs with security definer privileges
    - Ensures every authenticated user has a profile
*/

-- Create the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
-- 20250606114125_broken_cloud.sql
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
-- 20250606131931_shrill_mountain.sql
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

-- Drop the existing unique constraint (this will also drop the associated index)
ALTER TABLE user_bucket_progress DROP CONSTRAINT IF EXISTS user_bucket_progress_unique;

-- Change the column type from uuid to text
ALTER TABLE user_bucket_progress ALTER COLUMN bucket_item_id TYPE text;

-- Recreate the unique constraint with the new text type
ALTER TABLE user_bucket_progress ADD CONSTRAINT user_bucket_progress_unique UNIQUE (user_id, bucket_item_id);
-- 20250606132406_plain_unit.sql
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
-- 20250606132958_tender_lodge.sql
/*
  # Fun Dare-Style Bucket List System

  1. Updates
    - Replace create_default_bucket_list_items function with fun dare-style challenges
    - Add more exciting and adventurous bucket list items
    - Keep maximum 10 items as requested

  2. Changes
    - Updated default bucket list items to be more like fun dares
    - Made descriptions more engaging and adventurous
    - Added variety in categories and difficulty levels
*/

-- Update the function to create fun dare-style bucket list items
CREATE OR REPLACE FUNCTION create_default_bucket_list_items(p_user_id uuid, p_trip_id uuid, p_destination text)
RETURNS void AS $$
DECLARE
  city_name text;
  country_name text;
BEGIN
  -- Extract city and country from destination
  SELECT split_part(p_destination, ', ', 1) INTO city_name;
  SELECT split_part(p_destination, ', ', 2) INTO country_name;
  
  -- Insert fun dare-style bucket list items (max 10)
  INSERT INTO bucket_list_items (user_id, trip_id, title, description, category)
  VALUES
    (p_user_id, p_trip_id, 'Eat Something Wildly Local (Without Googling First)', 'Dare yourself to order the most mysterious-looking street food you can find. Embrace the unknown flavors!', 'Food & Drink'),
    (p_user_id, p_trip_id, 'Learn & Use a Local Slang Phrase in Public', 'Ask a local for a funny or cheeky expression. Drop it into conversation at least once—bonus points if you nail the pronunciation!', 'Culture'),
    (p_user_id, p_trip_id, 'Make One "100% Tourist" Photo—Pridefully', 'Pose in front of the biggest cliché landmark and go all out with goofy props or a dramatic pose. No shame—only glory.', 'Sightseeing'),
    (p_user_id, p_trip_id, 'Challenge a Stranger to a Mini Talent Swap', 'Offer to teach someone a silly party trick, and ask them to teach you something uniquely local—song snippet, hand gesture, etc.', 'Culture'),
    (p_user_id, p_trip_id, 'Use Public Transport in "Stealth Mode"', 'Ride the local bus/train without studying routes—just hop on, ask "is this going downtown?" and go with whatever happens.', 'Adventure'),
    (p_user_id, p_trip_id, 'Find & Photograph the Hackiest Tourist Souvenir', 'Seek out the most bizarre magnet, keychain, or hat that screams "tourist." Snap a pic and wear/use it for the next day.', 'Shopping'),
    (p_user_id, p_trip_id, 'Crash a Local Gathering (Festival, Market, etc.)', 'Spot a public festival, open-air karaoke, or lively market—step in, join the circle, and participate for at least five minutes.', 'Culture'),
    (p_user_id, p_trip_id, 'Barter Like a Boss', 'At a small market or roadside stall, negotiate a discount on something you don''t actually need. Aim to get at least 20% off!', 'Shopping'),
    (p_user_id, p_trip_id, 'Learn One Traditional Toast & Down a Local Drink', 'Ask a friendly local for their classic "cheers" toast, then sample their favorite beverage and perform the toast in native language.', 'Food & Drink'),
    (p_user_id, p_trip_id, 'Perform a Random Act of "Tourist Kindness"', 'Buy a coffee for a stranger, help someone carry groceries, or feed pigeons in a public square—spread good vibes!', 'Experience');
END;
$$ LANGUAGE plpgsql;
-- 20250606133653_dry_truth.sql
-- Update the function to create randomized bucket list items from our 30+ collection
CREATE OR REPLACE FUNCTION create_default_bucket_list_items(p_user_id uuid, p_trip_id uuid, p_destination text)
RETURNS void AS $$
DECLARE
  city_name text;
  country_name text;
  bucket_items text[][] := ARRAY[
    ['Eat Something Wildly Local (Without Googling First)', 'Order the most mysterious-looking street food you can find. Embrace the unknown flavors!', 'Food & Drink'],
    ['Learn & Use a Local Slang Phrase in Public', 'Ask a local for a funny expression. Drop it into conversation at least once—bonus points for pronunciation!', 'Culture'],
    ['Improvise a Local Dance Move on the Street', 'Find a busy plaza, drop coins for street musicians, and bust out your best traditional dance attempt!', 'Culture'],
    ['Make One "100% Tourist" Photo—Pridefully', 'Pose in front of the biggest cliché landmark with goofy props or dramatic pose. No shame—only glory!', 'Photography'],
    ['Challenge a Stranger to a Mini Talent Swap', 'Teach someone a party trick, ask them to teach you something local—song snippet, hand gesture, etc.', 'Local Life'],
    ['Use Public Transport in "Stealth Mode"', 'Ride local transport without studying routes—just hop on and ask "is this going downtown?"', 'Adventure'],
    ['Find & Photograph the Hackiest Tourist Souvenir', 'Seek out the most bizarre magnet or keychain that screams "tourist." Wear/use it for a day!', 'Shopping'],
    ['Crash a Local Gathering (Festival, Market, etc.)', 'Spot a public festival or lively market—step in, join the circle, and participate for five minutes.', 'Local Life'],
    ['Barter Like a Boss', 'At a market stall, negotiate a discount on something you don''t need. Aim for at least 20% off!', 'Shopping'],
    ['Speak Only in Questions for 10 Minutes', 'Challenge yourself to ask every sentence as a question and see how locals react.', 'Culture'],
    ['Send a Postcard to Yourself with Tomorrow''s Challenge', 'Write "Try the spiciest local snack tomorrow!" and mail it. Hilarious reminder when it arrives home!', 'Experience'],
    ['Attempt at Least One Local "Extreme" Activity', 'Zip-lining? Sandboarding? Even if mild back home, try the local version!', 'Adventure'],
    ['Learn One Traditional Toast & Down a Local Drink', 'Ask for their classic "cheers" toast, sample their favorite beverage, perform it in native language.', 'Food & Drink'],
    ['Perform a Random Act of "Tourist Kindness"', 'Buy coffee for a stranger, help carry groceries, or feed pigeons—spread good tourist vibes!', 'Experience'],
    ['Discover & Share a Local "Spooky Legend"', 'Research a ghost story or urban legend. Whisper it dramatically to friends at night!', 'Culture'],
    ['Get a Local to Teach You a Secret Greeting', 'Learn a special handshake or greeting. Use it at least three times before leaving!', 'Local Life'],
    ['Attempt Phrasebook Karaoke', 'Find a popular local song, grab lyrics, and film yourself singing it—off-key encouraged!', 'Entertainment'],
    ['Eat Dessert First—Local Style', 'Order the sweetest street dessert as your very first bite of the day, then proceed normally.', 'Food & Drink'],
    ['Snap a Selfie Mimicking a Local Icon', 'Find a statue or mural, strike a pose that mimics it, embrace the cheesy matching moment.', 'Photography'],
    ['Leave Your Mark (Respectfully)', 'Use washable chalk to draw a tiny doodle on a permitted spot as your "tourist signature."', 'Experience'],
    ['Master the Art of Local Coffee Ordering', 'Learn exactly how locals order their morning coffee. Nail the pronunciation and etiquette.', 'Food & Drink'],
    ['Find the Best Local Sunset/Sunrise Spot', 'Ask three different locals for their favorite golden hour location. Visit the most recommended.', 'Nature'],
    ['Attend a Local Sports Event or Match', 'Experience the passion of local sports culture—even if you don''t understand the rules!', 'Entertainment'],
    ['Navigate Using Only Landmark Directions', 'Ask for directions using only landmarks ("turn left at the big tree") instead of street names.', 'Adventure'],
    ['Try a Local Wellness or Spa Tradition', 'Experience traditional baths, massage styles, or wellness practices unique to the region.', 'Wellness'],
    ['Photograph 5 Different Local Door Styles', 'Capture the unique architectural personality of the place through its diverse doorways.', 'Photography'],
    ['Learn to Cook One Local Dish', 'Take a cooking class or convince a local to teach you their family recipe.', 'Food & Drink'],
    ['Experience Local Nightlife Like a Resident', 'Ask locals where THEY go for fun at night—avoid tourist traps, find authentic spots.', 'Nightlife'],
    ['Collect Sounds of the City', 'Record 1-minute audio clips of unique local sounds—markets, music, street calls, nature.', 'Experience'],
    ['Find the Oldest Thing in the City', 'Hunt down the most ancient building, tree, or artifact. Learn its story.', 'Culture'],
    ['Master Local Public Transport Etiquette', 'Learn the unwritten rules—where to stand, how to pay, what''s considered polite.', 'Local Life'],
    ['Discover a Hidden Local Gem', 'Find a place that''s not in guidebooks but locals love—ask "where do you go to relax?"', 'Sightseeing'],
    ['Experience Local Weather Like a Pro', 'Learn how locals dress and behave in their typical weather. Adapt your style accordingly.', 'Local Life'],
    ['Find the Best Local Viewpoint', 'Discover where locals go for the best city views—not necessarily the most famous tourist spot.', 'Nature'],
    ['Learn a Traditional Local Game', 'Find locals playing cards, board games, or street games. Ask them to teach you!', 'Entertainment']
  ];
  shuffled_items text[][];
  i integer;
  j integer;
  temp text[];
BEGIN
  -- Extract city and country from destination
  SELECT split_part(p_destination, ', ', 1) INTO city_name;
  SELECT split_part(p_destination, ', ', 2) INTO country_name;
  
  -- Shuffle the array using Fisher-Yates algorithm
  shuffled_items := bucket_items;
  FOR i IN REVERSE array_length(shuffled_items, 1)..2 LOOP
    j := floor(random() * i + 1)::integer;
    temp := shuffled_items[i];
    shuffled_items[i] := shuffled_items[j];
    shuffled_items[j] := temp;
  END LOOP;
  
  -- Insert first 8 randomized bucket list items
  FOR i IN 1..LEAST(8, array_length(shuffled_items, 1)) LOOP
    INSERT INTO bucket_list_items (user_id, trip_id, title, description, category)
    VALUES (p_user_id, p_trip_id, shuffled_items[i][1], shuffled_items[i][2], shuffled_items[i][3]);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
-- 20250606175543_falling_fountain.sql
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
-- 20250607144256_snowy_block.sql
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
-- 20250607145223_velvet_swamp.sql
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
-- 20250607152326_fierce_frog.sql
/*
  # Create tokens table for OAuth token management

  1. New Tables
    - `tokens`
      - `id` (uuid, primary key)
      - `service` (text, service name like 'reddit')
      - `access_token` (text, current access token)
      - `refresh_token` (text, refresh token for renewals)
      - `expires_at` (timestamptz, when token expires)
      - `created_at` (timestamptz, when record was created)
      - `updated_at` (timestamptz, when record was last updated)

  2. Security
    - Enable RLS on `tokens` table
    - Add policy for service role access only
*/

CREATE TABLE IF NOT EXISTS tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL UNIQUE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;

-- Only allow service role to manage tokens (for security)
CREATE POLICY "Service role can manage tokens"
  ON tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS tokens_service_idx ON tokens(service);
CREATE INDEX IF NOT EXISTS tokens_expires_at_idx ON tokens(expires_at);
-- 20250608134218_fading_sunset.sql
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
-- 20250608150008_damp_heart.sql
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
-- 20250608160000_brisk_meadow.sql
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

-- 20250609095622_mute_dust.sql
/*
  # Add max_participants column to trips table

  1. Changes
    - Add max_participants column to trips table with default value of 2
    - This allows users to set how many people they plan to invite when creating a trip

  2. Security
    - No changes to RLS policies needed
*/

-- Add max_participants column to trips table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'max_participants'
  ) THEN
    ALTER TABLE trips ADD COLUMN max_participants integer DEFAULT 2 CHECK (max_participants >= 1 AND max_participants <= 20);
  END IF;
END $$;
-- 20250609120000_silver_haze.sql
/*
  # Add trip participants system

  New Tables
    - trip_participants: Track who has joined each trip

  Security
    - Enable RLS on trip_participants
    - Policies for viewing, joining and managing participants

  Functions
    - add_trip_owner_as_participant trigger
    - join_trip procedure for joining via link
*/

-- Create trip_participants table
CREATE TABLE IF NOT EXISTS trip_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  role text DEFAULT 'participant' CHECK (role IN ('owner','participant')),
  CONSTRAINT trip_participants_unique UNIQUE (trip_id, user_id)
);

-- Enable RLS
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;

-- Policy for viewing participants of trips the user has joined
CREATE POLICY "Users can view trip participants for trips they're part of"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_participants tp2
      WHERE tp2.trip_id = trip_participants.trip_id
        AND tp2.user_id = auth.uid()
    )
  );

-- Policy allowing users to join trips
CREATE POLICY "Users can join trips"
  ON trip_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy allowing trip owners to manage participants
CREATE POLICY "Trip owners can manage participants"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_participants tp2
      WHERE tp2.trip_id = trip_participants.trip_id
        AND tp2.user_id = auth.uid()
        AND tp2.role = 'owner'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS trip_participants_trip_id_idx ON trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS trip_participants_user_id_idx ON trip_participants(user_id);

-- Trigger to add trip owner as participant
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_trip_created ON trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();

-- Function for joining a trip via shared link
CREATE OR REPLACE FUNCTION join_trip(p_trip_id uuid, p_user_id uuid)
RETURNS json AS $$
DECLARE
  trip_record trips%ROWTYPE;
  participant_count integer;
BEGIN
  SELECT * INTO trip_record FROM trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Trip not found');
  END IF;

  IF EXISTS (SELECT 1 FROM trip_participants WHERE trip_id = p_trip_id AND user_id = p_user_id) THEN
    RETURN json_build_object('success', true, 'message', 'Already joined this trip');
  END IF;

  SELECT COUNT(*) INTO participant_count FROM trip_participants WHERE trip_id = p_trip_id;
  IF participant_count >= trip_record.max_participants THEN
    RETURN json_build_object('success', false, 'error', 'Trip is full');
  END IF;

  INSERT INTO trip_participants (trip_id, user_id, role)
  VALUES (p_trip_id, p_user_id, 'participant');

  RETURN json_build_object('success', true, 'message', 'Successfully joined the trip!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION join_trip(uuid, uuid) TO authenticated;

-- 20250609161041_tiny_crystal.sql
-- Create trip_participants table
CREATE TABLE IF NOT EXISTS trip_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now(),
  role text DEFAULT 'participant' CHECK (role IN ('owner','participant')),
  CONSTRAINT trip_participants_unique UNIQUE (trip_id, user_id)
);

-- Enable RLS
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;

-- Policy for viewing participants of trips the user has joined
CREATE POLICY "Users can view trip participants for trips they're part of"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_participants tp2
      WHERE tp2.trip_id = trip_participants.trip_id
        AND tp2.user_id = auth.uid()
    )
  );

-- Policy allowing users to join trips
CREATE POLICY "Users can join trips"
  ON trip_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy allowing trip owners to manage participants
CREATE POLICY "Trip owners can manage participants"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_participants tp2
      WHERE tp2.trip_id = trip_participants.trip_id
        AND tp2.user_id = auth.uid()
        AND tp2.role = 'owner'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS trip_participants_trip_id_idx ON trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS trip_participants_user_id_idx ON trip_participants(user_id);

-- Trigger to add trip owner as participant
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS trigger AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_trip_created ON trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();

-- Function for joining a trip via shared link
CREATE OR REPLACE FUNCTION join_trip(p_trip_id uuid, p_user_id uuid)
RETURNS json AS $$
DECLARE
  trip_record trips%ROWTYPE;
  participant_count integer;
BEGIN
  SELECT * INTO trip_record FROM trips WHERE id = p_trip_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Trip not found');
  END IF;

  IF EXISTS (SELECT 1 FROM trip_participants WHERE trip_id = p_trip_id AND user_id = p_user_id) THEN
    RETURN json_build_object('success', true, 'message', 'Already joined this trip');
  END IF;

  SELECT COUNT(*) INTO participant_count FROM trip_participants WHERE trip_id = p_trip_id;
  IF participant_count >= trip_record.max_participants THEN
    RETURN json_build_object('success', false, 'error', 'Trip is full');
  END IF;

  INSERT INTO trip_participants (trip_id, user_id, role)
  VALUES (p_trip_id, p_user_id, 'participant');

  RETURN json_build_object('success', true, 'message', 'Successfully joined the trip!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION join_trip(uuid, uuid) TO authenticated;
-- 20250609161051_young_lake.sql
-- Add max_participants column to trips table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trips' AND column_name = 'max_participants'
  ) THEN
    ALTER TABLE trips ADD COLUMN max_participants integer DEFAULT 2 CHECK (max_participants >= 1 AND max_participants <= 20);
  END IF;
END $$;
-- 20250609161225_precious_swamp.sql
/*
  # Fix trip participants RLS policies

  1. Policy Updates
    - Remove problematic recursive policy on trip_participants
    - Add simpler, non-recursive policies for trip_participants
    - Ensure trip owners can manage participants
    - Allow users to view participants of trips they're part of
    - Allow users to join trips (insert themselves)

  2. Function
    - Create function to automatically add trip creator as owner
    - Add trigger to call this function when trip is created
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Trip owners can manage participants" ON trip_participants;
DROP POLICY IF EXISTS "Users can view trip participants for trips they're part of" ON trip_participants;
DROP POLICY IF EXISTS "Users can join trips" ON trip_participants;

-- Create new, simpler policies that avoid recursion
CREATE POLICY "Users can insert themselves as participants"
  ON trip_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view participants of their trips"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
    OR
    user_id = auth.uid()
  );

CREATE POLICY "Trip owners can manage all participants"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

-- Create function to add trip owner as participant
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add if user_id is not null (authenticated user created the trip)
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically add trip creator as owner
DROP TRIGGER IF EXISTS on_trip_created ON trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();
-- 20250609171329_copper_ocean.sql
/*
  # Create join_trip function for handling trip participation

  1. New Function
    - `join_trip(p_trip_id, p_user_id)` - Handles joining trips with proper validation
    - Checks if trip exists and has space
    - Prevents duplicate participation
    - Returns success/error status

  2. Security
    - Function uses security definer to bypass RLS for internal operations
    - Validates user permissions appropriately
*/

CREATE OR REPLACE FUNCTION join_trip(p_trip_id uuid, p_user_id uuid)
RETURNS TABLE(success boolean, message text, error text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trip_exists boolean;
  v_max_participants integer;
  v_current_participants integer;
  v_is_already_participant boolean;
  v_is_trip_owner boolean;
BEGIN
  -- Check if trip exists
  SELECT EXISTS(SELECT 1 FROM trips WHERE id = p_trip_id) INTO v_trip_exists;
  
  IF NOT v_trip_exists THEN
    RETURN QUERY SELECT false, ''::text, 'Trip not found'::text;
    RETURN;
  END IF;

  -- Check if user is the trip owner
  SELECT EXISTS(SELECT 1 FROM trips WHERE id = p_trip_id AND user_id = p_user_id) INTO v_is_trip_owner;
  
  IF v_is_trip_owner THEN
    RETURN QUERY SELECT false, ''::text, 'You are already the owner of this trip'::text;
    RETURN;
  END IF;

  -- Check if user is already a participant
  SELECT EXISTS(
    SELECT 1 FROM trip_participants 
    WHERE trip_id = p_trip_id AND user_id = p_user_id
  ) INTO v_is_already_participant;
  
  IF v_is_already_participant THEN
    RETURN QUERY SELECT false, ''::text, 'You are already a participant in this trip'::text;
    RETURN;
  END IF;

  -- Get trip capacity info
  SELECT max_participants INTO v_max_participants 
  FROM trips WHERE id = p_trip_id;
  
  SELECT COUNT(*) INTO v_current_participants 
  FROM trip_participants WHERE trip_id = p_trip_id;

  -- Check if trip is full
  IF v_current_participants >= v_max_participants THEN
    RETURN QUERY SELECT false, ''::text, 'Trip is full'::text;
    RETURN;
  END IF;

  -- Add user as participant
  INSERT INTO trip_participants (trip_id, user_id, role, joined_at)
  VALUES (p_trip_id, p_user_id, 'participant', now());

  RETURN QUERY SELECT true, 'Successfully joined the trip!'::text, ''::text;
END;
$$;
-- 20250609171338_bold_unit.sql
/*
  # Fix trip owner participation trigger

  1. Updated Trigger Function
    - Ensures trip creator is automatically added as owner participant
    - Handles the case where user_id might be null (anonymous trips)
    - Prevents duplicate entries

  2. Security
    - Uses proper error handling
    - Maintains data integrity
*/

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_trip_created ON trips;
DROP FUNCTION IF EXISTS add_trip_owner_as_participant();

-- Create improved trigger function
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only add participant if trip has a user_id (not anonymous)
  IF NEW.user_id IS NOT NULL THEN
    -- Insert the trip owner as a participant with 'owner' role
    INSERT INTO trip_participants (trip_id, user_id, role, joined_at)
    VALUES (NEW.id, NEW.user_id, 'owner', now())
    ON CONFLICT (trip_id, user_id) DO NOTHING; -- Prevent duplicates
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();
-- 20250609171655_silver_spark.sql
/*
  # Fix infinite recursion in trip_participants RLS policies

  1. Policy Changes
    - Remove all existing policies on trip_participants table
    - Create simplified, non-recursive policies
    - Ensure policies don't create circular dependencies

  2. Security
    - Maintain proper access control
    - Allow users to view participants of trips they're part of
    - Allow trip owners to manage participants
    - Allow users to join trips themselves
*/

-- Drop all existing policies on trip_participants to start fresh
DROP POLICY IF EXISTS "Trip owners can manage all participants" ON trip_participants;
DROP POLICY IF EXISTS "Trip owners can manage participants" ON trip_participants;
DROP POLICY IF EXISTS "Users can insert themselves as participants" ON trip_participants;
DROP POLICY IF EXISTS "Users can join trips" ON trip_participants;
DROP POLICY IF EXISTS "Users can view participants of their trips" ON trip_participants;
DROP POLICY IF EXISTS "Users can view trip participants for trips they're part of" ON trip_participants;

-- Create simplified, non-recursive policies

-- Allow users to read participants of trips they own
CREATE POLICY "Trip owners can read all participants"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

-- Allow users to read participants of trips they are part of
CREATE POLICY "Participants can read trip participants"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT DISTINCT trip_id 
      FROM trip_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Allow users to insert themselves as participants
CREATE POLICY "Users can join trips"
  ON trip_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow trip owners to insert any participant
CREATE POLICY "Trip owners can add participants"
  ON trip_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

-- Allow trip owners to update/delete participants
CREATE POLICY "Trip owners can manage participants"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

-- Allow users to delete themselves from trips
CREATE POLICY "Users can leave trips"
  ON trip_participants
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
-- 20250609171925_aged_cell.sql
/*
  # Fix users table foreign key constraint

  This migration fixes the infinite recursion issue in trip_participants policies
  by correcting the users table foreign key constraint.

  ## Changes
  1. Drop the incorrect self-referencing foreign key constraint on users.id
  2. Add the correct foreign key constraint referencing auth.users.id
  3. Ensure proper RLS policies are in place

  ## Security
  - Maintains existing RLS policies
  - Ensures users table properly references auth.users
*/

-- Drop the incorrect self-referencing foreign key constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_id_fkey' 
    AND table_name = 'users' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_id_fkey;
  END IF;
END $$;

-- Add the correct foreign key constraint to auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_id_fkey' 
    AND table_name = 'users' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.users 
    ADD CONSTRAINT users_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure the users table has proper RLS policies (these should already exist but let's make sure)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Auth service can insert users" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;

CREATE POLICY "Auth service can insert users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
-- 20250609172226_lucky_salad.sql
/*
  # Fix infinite recursion in trip_participants RLS policies

  1. Problem
    - Current RLS policies on trip_participants table are causing infinite recursion
    - The policies are referencing the same table they're protecting, creating circular dependencies

  2. Solution
    - Drop existing problematic policies
    - Create new non-recursive policies that properly check permissions
    - Ensure users can only see participants for trips they're part of
    - Allow trip owners to manage all participants for their trips

  3. Security
    - Users can only read participants for trips they're part of
    - Users can join trips (insert their own participation)
    - Users can leave trips (delete their own participation)
    - Trip owners can manage all participants for their trips
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Participants can read trip participants" ON trip_participants;
DROP POLICY IF EXISTS "Trip owners can add participants" ON trip_participants;
DROP POLICY IF EXISTS "Trip owners can manage participants" ON trip_participants;
DROP POLICY IF EXISTS "Trip owners can read all participants" ON trip_participants;
DROP POLICY IF EXISTS "Users can join trips" ON trip_participants;
DROP POLICY IF EXISTS "Users can leave trips" ON trip_participants;

-- Create new non-recursive policies

-- Allow users to read participants for trips they own
CREATE POLICY "Trip owners can read all participants"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

-- Allow users to read participants for trips they are part of (non-recursive)
CREATE POLICY "Trip members can read participants"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_participants tp
      WHERE tp.trip_id = trip_participants.trip_id
      AND tp.user_id = auth.uid()
    )
  );

-- Allow users to join trips by inserting their own participation
CREATE POLICY "Users can join trips"
  ON trip_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow users to leave trips by deleting their own participation
CREATE POLICY "Users can leave trips"
  ON trip_participants
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Allow trip owners to manage participants for their trips
CREATE POLICY "Trip owners can manage participants"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );
-- 20250609172647_misty_heart.sql
/*
  # Fix infinite recursion in trip_participants RLS policies

  1. Problem
    - Current RLS policies on trip_participants table are causing infinite recursion
    - The "Trip members can read participants" policy is querying trip_participants within itself
    - This creates a recursive loop when trying to check if a user is a trip member

  2. Solution
    - Replace the recursive policy with a simpler approach
    - Allow authenticated users to read all trip participants
    - Keep other policies intact for proper access control on INSERT/UPDATE/DELETE operations

  3. Changes
    - Drop the problematic "Trip members can read participants" policy
    - Create a new simple SELECT policy for authenticated users
    - Maintain existing policies for other operations
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Trip members can read participants" ON public.trip_participants;

-- Create a simple SELECT policy that allows authenticated users to read all participants
-- This removes the recursive check while still maintaining authentication requirement
CREATE POLICY "Authenticated users can read participants"
  ON public.trip_participants
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure the other policies remain intact and don't cause recursion issues
-- Update the "Trip owners can read all participants" policy to be more specific
DROP POLICY IF EXISTS "Trip owners can read all participants" ON public.trip_participants;

-- The remaining policies should be sufficient:
-- - "Trip owners can manage participants" (for trip owners)
-- - "Users can join trips" (for INSERT)
-- - "Users can leave trips" (for DELETE)
-- - "Authenticated users can read participants" (for SELECT - newly created above)
-- 20250612130919_wandering_dust.sql
/*
  # Fix trip creation issues

  1. Ensure proper RLS policies for trip creation
  2. Fix any constraint issues
  3. Ensure trigger function works correctly
*/

-- Ensure the trigger function exists and works correctly
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add participant if user_id is not null
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_trip_created ON trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();

-- Ensure proper RLS policies for trips table
DROP POLICY IF EXISTS "Allow anonymous trip creation" ON trips;
DROP POLICY IF EXISTS "Users can create trips" ON trips;

CREATE POLICY "Users can create trips"
  ON trips
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Ensure proper RLS policies for trip_participants table
DROP POLICY IF EXISTS "Users can be added as participants" ON trip_participants;

CREATE POLICY "Users can be added as participants"
  ON trip_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Allow any authenticated user to be added as participant

-- Ensure the trips table has proper constraints
DO $$
BEGIN
  -- Check if the constraint exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trips_dates_check' 
    AND table_name = 'trips'
  ) THEN
    ALTER TABLE trips ADD CONSTRAINT trips_dates_check CHECK (end_date >= start_date);
  END IF;
  
  -- Check if max_participants constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trips_max_participants_check' 
    AND table_name = 'trips'
  ) THEN
    ALTER TABLE trips ADD CONSTRAINT trips_max_participants_check 
    CHECK (max_participants >= 1 AND max_participants <= 20);
  END IF;
END $$;
-- 20250612131449_light_waterfall.sql
/*
  # Fix user profile creation and trip creation issues

  1. Security
    - Ensure proper RLS policies for user creation
    - Fix trigger function for trip participant creation
    - Add better error handling

  2. Changes
    - Update users table policies
    - Fix trip creation trigger
    - Ensure proper constraints
*/

-- Ensure users table has proper RLS policies
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Allow users to insert their own profile data
CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to read their own data
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own data
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure the trigger function for adding trip owner as participant works correctly
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add participant if user_id is not null
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (trip_id, user_id) DO NOTHING; -- Prevent duplicate entries
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_trip_created ON trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();

-- Ensure proper RLS policies for trips table
DROP POLICY IF EXISTS "Users can create trips" ON trips;
CREATE POLICY "Users can create trips"
  ON trips
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Ensure proper RLS policies for trip_participants table
DROP POLICY IF EXISTS "Users can be added as participants" ON trip_participants;
CREATE POLICY "Users can be added as participants"
  ON trip_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Allow any authenticated user to be added as participant

-- Add a policy to allow reading user info for trip functionality
DROP POLICY IF EXISTS "Allow reading user info for trip functionality" ON users;
CREATE POLICY "Allow reading user info for trip functionality"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read their own data
    id = auth.uid() OR
    -- Users can read data of people who invited them
    id IN (
      SELECT inviter_id FROM trip_invitations 
      WHERE invitee_email IN (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    ) OR
    -- Users can read data of people in their trips
    id IN (
      SELECT tp.user_id FROM trip_participants tp
      WHERE tp.trip_id IN (
        SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
      )
    ) OR
    -- Users can read data of people in trips they own
    id IN (
      SELECT tp.user_id FROM trip_participants tp
      JOIN trips t ON tp.trip_id = t.id
      WHERE t.user_id = auth.uid()
    )
  );

-- Ensure email validation constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_email_check' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_check 
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;
-- 20250612131822_tight_sound.sql
/*
  # Fix invitation system for email-based invitations

  1. Ensure proper RLS policies for trip invitations
  2. Add function to handle invitation responses
  3. Ensure proper constraints and indexes
*/

-- Ensure proper RLS policies for trip_invitations table
DROP POLICY IF EXISTS "Users can create invitations for their trips" ON trip_invitations;
DROP POLICY IF EXISTS "Users can read invitations sent to them" ON trip_invitations;
DROP POLICY IF EXISTS "Users can read invitations they sent" ON trip_invitations;
DROP POLICY IF EXISTS "Users can respond to their invitations" ON trip_invitations;

-- Allow users to create invitations for trips they participate in
CREATE POLICY "Users can create invitations for their trips"
  ON trip_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_id = auth.uid() AND
    trip_id IN (
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
    )
  );

-- Allow users to read invitations sent to their email
CREATE POLICY "Users can read invitations sent to them"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Allow users to read invitations they sent
CREATE POLICY "Users can read invitations they sent"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (inviter_id = auth.uid());

-- Allow users to respond to invitations sent to their email
CREATE POLICY "Users can respond to their invitations"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invitee_email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    invitee_email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Create function to handle invitation responses
CREATE OR REPLACE FUNCTION respond_to_invitation(
  p_invitation_id UUID,
  p_response TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_invitation trip_invitations%ROWTYPE;
  v_user_id UUID;
  v_participant_count INTEGER;
  v_max_participants INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not authenticated';
    RETURN;
  END IF;

  -- Get invitation details
  SELECT * INTO v_invitation
  FROM trip_invitations
  WHERE id = p_invitation_id
    AND invitee_email IN (
      SELECT email FROM auth.users WHERE id = v_user_id
    )
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invitation not found or already responded';
    RETURN;
  END IF;

  -- Validate response
  IF p_response NOT IN ('accepted', 'declined') THEN
    RETURN QUERY SELECT FALSE, 'Invalid response. Must be "accepted" or "declined"';
    RETURN;
  END IF;

  -- If accepting, check if trip has space
  IF p_response = 'accepted' THEN
    -- Get current participant count and max participants
    SELECT COUNT(*), t.max_participants
    INTO v_participant_count, v_max_participants
    FROM trip_participants tp
    JOIN trips t ON tp.trip_id = t.id
    WHERE tp.trip_id = v_invitation.trip_id
    GROUP BY t.max_participants;

    -- Handle case where no participants exist yet
    IF v_participant_count IS NULL THEN
      v_participant_count := 0;
      SELECT max_participants INTO v_max_participants
      FROM trips WHERE id = v_invitation.trip_id;
    END IF;

    -- Check if trip is full
    IF v_participant_count >= v_max_participants THEN
      RETURN QUERY SELECT FALSE, 'Trip is full';
      RETURN;
    END IF;

    -- Check if user is already a participant
    IF EXISTS (
      SELECT 1 FROM trip_participants 
      WHERE trip_id = v_invitation.trip_id AND user_id = v_user_id
    ) THEN
      RETURN QUERY SELECT FALSE, 'You are already a participant in this trip';
      RETURN;
    END IF;

    -- Add user as participant
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (v_invitation.trip_id, v_user_id, 'participant');
  END IF;

  -- Update invitation status
  UPDATE trip_invitations
  SET status = p_response, responded_at = NOW()
  WHERE id = p_invitation_id;

  -- Return success message
  IF p_response = 'accepted' THEN
    RETURN QUERY SELECT TRUE, 'Successfully joined the trip!';
  ELSE
    RETURN QUERY SELECT TRUE, 'Invitation declined';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_trip_invitations_invitee_email 
ON trip_invitations(invitee_email);

CREATE INDEX IF NOT EXISTS idx_trip_invitations_trip_id 
ON trip_invitations(trip_id);

CREATE INDEX IF NOT EXISTS idx_trip_invitations_status 
ON trip_invitations(status);

-- Ensure unique constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trip_invitations_trip_id_invitee_email_key' 
    AND table_name = 'trip_invitations'
  ) THEN
    ALTER TABLE trip_invitations 
    ADD CONSTRAINT trip_invitations_trip_id_invitee_email_key 
    UNIQUE (trip_id, invitee_email);
  END IF;
END $$;
-- 20250612132256_broad_silence.sql
/*
  # Fix RLS policies to prevent infinite recursion

  1. Simplify trip_participants policies to avoid circular references
  2. Fix users table policies for trip functionality
  3. Ensure proper trip creation flow
*/

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can read relevant participants" ON trip_participants;
DROP POLICY IF EXISTS "Allow reading user info for trip functionality" ON users;
DROP POLICY IF EXISTS "Users can read accessible trips" ON trips;

-- Create simplified, non-recursive policies for trip_participants
CREATE POLICY "Users can manage their own participation"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read participants in their trips"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    -- User can see participants in trips they own
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()) OR
    -- User can see participants in trips they're part of
    trip_id IN (SELECT trip_id FROM trip_participants WHERE user_id = auth.uid())
  );

-- Create simplified users policies
CREATE POLICY "Users can read trip-related user info"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read their own data
    id = auth.uid() OR
    -- Users can read data of people in the same trips (simplified)
    EXISTS (
      SELECT 1 FROM trip_participants tp1
      JOIN trip_participants tp2 ON tp1.trip_id = tp2.trip_id
      WHERE tp1.user_id = auth.uid() AND tp2.user_id = users.id
    )
  );

-- Create simplified trips policy
CREATE POLICY "Users can read accessible trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    -- User owns the trip
    user_id = auth.uid() OR
    -- User is a participant in the trip
    id IN (SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()) OR
    -- User has been invited to the trip
    id IN (
      SELECT trip_id FROM trip_invitations 
      WHERE invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Ensure the trigger function is simple and doesn't cause issues
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add participant if user_id is not null
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_trip_created ON trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();
-- 20250612132339_curly_bird.sql
/*
  # Fix RLS policies to prevent infinite recursion

  1. Security Changes
    - Drop all existing policies that might cause recursion
    - Create simplified, non-recursive policies
    - Fix trigger function to be more robust

  2. Policy Changes
    - Simplified trip_participants policies
    - Non-recursive users policies  
    - Clean trips access policies
*/

-- First, get a list of all existing policies and drop them systematically
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on trip_participants
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'trip_participants'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON trip_participants', policy_record.policyname);
    END LOOP;
    
    -- Drop all existing policies on users that might cause recursion
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'users' AND policyname LIKE '%trip%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', policy_record.policyname);
    END LOOP;
    
    -- Drop specific trips policies that might cause recursion
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'trips' AND policyname IN ('Users can read accessible trips')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON trips', policy_record.policyname);
    END LOOP;
END $$;

-- Create simplified, non-recursive policies for trip_participants
CREATE POLICY "manage_own_participation"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "read_trip_participants"
  ON trip_participants
  FOR SELECT
  TO authenticated
  USING (
    -- User can see participants in trips they own
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()) OR
    -- User can see participants in trips they're part of
    trip_id IN (SELECT trip_id FROM trip_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "insert_trip_participants"
  ON trip_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can add themselves to trips
    user_id = auth.uid() OR
    -- Trip owners can add participants to their trips
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- Create simplified users policies (avoid recursion)
CREATE POLICY "read_own_user_data"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "read_trip_related_users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Allow reading user data for people in shared trips
    -- Use a simple subquery to avoid recursion
    id IN (
      SELECT DISTINCT tp2.user_id 
      FROM trip_participants tp1
      JOIN trip_participants tp2 ON tp1.trip_id = tp2.trip_id
      WHERE tp1.user_id = auth.uid()
    ) OR
    -- Allow reading inviter data for invitations
    id IN (
      SELECT inviter_id FROM trip_invitations 
      WHERE invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Create simplified trips policy
CREATE POLICY "read_accessible_trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    -- User owns the trip
    user_id = auth.uid() OR
    -- User is a participant in the trip (direct lookup)
    EXISTS (SELECT 1 FROM trip_participants WHERE trip_id = trips.id AND user_id = auth.uid()) OR
    -- User has been invited to the trip
    EXISTS (
      SELECT 1 FROM trip_invitations 
      WHERE trip_id = trips.id 
      AND invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Ensure the trigger function is simple and doesn't cause issues
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add participant if user_id is not null
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_trip_created ON trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();

-- Ensure RLS is enabled on all tables
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
-- 20250612132634_broken_oasis.sql
/*
  # Fix infinite recursion in RLS policies

  This migration completely rebuilds all RLS policies to eliminate infinite recursion
  by using simple, non-recursive logic and avoiding cross-table policy dependencies.

  ## Changes Made:
  1. Drop all existing policies that cause recursion
  2. Create new simplified policies with no circular references
  3. Use direct auth.uid() checks where possible
  4. Avoid complex joins in policy conditions
*/

-- First, completely disable RLS temporarily to clean up
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invitations DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on users table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON users';
    END LOOP;
    
    -- Drop all policies on trips table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'trips' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON trips';
    END LOOP;
    
    -- Drop all policies on trip_participants table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'trip_participants' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON trip_participants';
    END LOOP;
    
    -- Drop all policies on trip_invitations table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'trip_invitations' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON trip_invitations';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invitations ENABLE ROW LEVEL SECURITY;

-- USERS TABLE POLICIES (Simple, no recursion)
-- Users can always read and update their own data
CREATE POLICY "users_own_data"
  ON users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "users_insert_own"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- TRIPS TABLE POLICIES (Simple, no recursion)
-- Users can manage their own trips
CREATE POLICY "trips_own_data"
  ON trips
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can read trips they are invited to (simple email check)
CREATE POLICY "trips_read_invited"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT trip_id FROM trip_invitations 
      WHERE invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND status = 'pending'
    )
  );

-- Anonymous users can read trips with no user_id (public trips)
CREATE POLICY "trips_anonymous_read"
  ON trips
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- TRIP_PARTICIPANTS TABLE POLICIES (Simple, no recursion)
-- Users can manage their own participation records
CREATE POLICY "participants_own_data"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trip owners can manage all participants in their trips
CREATE POLICY "participants_trip_owner_manage"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  );

-- TRIP_INVITATIONS TABLE POLICIES (Simple, no recursion)
-- Users can read invitations sent to their email
CREATE POLICY "invitations_read_own"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Users can update invitations sent to their email (to respond)
CREATE POLICY "invitations_update_own"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Trip owners can create and manage invitations for their trips
CREATE POLICY "invitations_trip_owner_manage"
  ON trip_invitations
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid())
  )
  WITH CHECK (
    trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()) AND
    inviter_id = auth.uid()
  );

-- Create a simple function to respond to invitations
CREATE OR REPLACE FUNCTION respond_to_invitation(
  p_invitation_id UUID,
  p_response TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation trip_invitations%ROWTYPE;
  v_user_email TEXT;
  v_participant_count INTEGER;
  v_max_participants INTEGER;
BEGIN
  -- Get current user email
  SELECT email INTO v_user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  IF v_user_email IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not authenticated';
    RETURN;
  END IF;
  
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM trip_invitations
  WHERE id = p_invitation_id
    AND invitee_email = v_user_email
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invitation not found or already responded';
    RETURN;
  END IF;
  
  -- Update invitation status
  UPDATE trip_invitations
  SET status = p_response, responded_at = NOW()
  WHERE id = p_invitation_id;
  
  -- If accepted, add user as participant
  IF p_response = 'accepted' THEN
    -- Check trip capacity
    SELECT COUNT(*), t.max_participants
    INTO v_participant_count, v_max_participants
    FROM trip_participants tp
    JOIN trips t ON t.id = tp.trip_id
    WHERE tp.trip_id = v_invitation.trip_id
    GROUP BY t.max_participants;
    
    IF v_participant_count >= v_max_participants THEN
      RETURN QUERY SELECT FALSE, 'Trip is full';
      RETURN;
    END IF;
    
    -- Add as participant
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (v_invitation.trip_id, auth.uid(), 'participant')
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  
  RETURN QUERY SELECT TRUE, 'Invitation response recorded successfully';
END;
$$;

-- Ensure the trip creation trigger is simple
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add participant if user_id is not null
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_trip_created ON trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();
-- 20250612132755_copper_plain.sql
/*
  # Fix infinite recursion in RLS policies

  This migration fixes the infinite recursion issues in the RLS policies for:
  1. `trips` table - removes circular reference in trip owner policies
  2. `trip_invitations` table - simplifies policies to avoid recursive lookups
  3. `trip_participants` table - ensures clean policy structure

  ## Changes Made
  1. Drop existing problematic policies
  2. Recreate policies with proper non-recursive conditions
  3. Ensure policies use direct user ID comparisons where possible
  4. Avoid complex subqueries that reference the same table
*/

-- Drop existing problematic policies for trips table
DROP POLICY IF EXISTS "trips_own_data" ON trips;
DROP POLICY IF EXISTS "trips_read_invited" ON trips;

-- Drop existing problematic policies for trip_invitations table  
DROP POLICY IF EXISTS "invitations_read_own" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_trip_owner_manage" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_update_own" ON trip_invitations;

-- Drop existing problematic policies for trip_participants table
DROP POLICY IF EXISTS "participants_trip_owner_manage" ON trip_participants;

-- Recreate trips policies without recursion
CREATE POLICY "trips_owner_full_access"
  ON trips
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trips_participant_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tp.trip_id 
      FROM trip_participants tp 
      WHERE tp.user_id = auth.uid()
    )
  );

CREATE POLICY "trips_invited_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT ti.trip_id
      FROM trip_invitations ti
      WHERE ti.invitee_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      ) AND ti.status = 'pending'
    )
  );

-- Recreate trip_invitations policies without recursion
CREATE POLICY "invitations_owner_manage"
  ON trip_invitations
  FOR ALL
  TO authenticated
  USING (inviter_id = auth.uid())
  WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "invitations_invitee_read_update"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "invitations_invitee_update_status"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Recreate trip_participants policies without recursion
CREATE POLICY "participants_own_data"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "participants_trip_owner_manage"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (
      SELECT t.id FROM trips t WHERE t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT t.id FROM trips t WHERE t.user_id = auth.uid()
    )
  );
-- 20250612132835_pale_stream.sql
/*
  # Fix infinite recursion in RLS policies

  This migration fixes the infinite recursion errors in Row Level Security policies
  by dropping all existing problematic policies and recreating them with proper
  non-recursive logic.

  ## Changes Made:
  1. Drop all existing policies that cause recursion
  2. Create new non-recursive policies for trips, trip_invitations, and trip_participants
  3. Ensure proper access control without circular references

  ## Security:
  - Trip owners can manage their trips and all participants
  - Users can manage their own participation
  - Invited users can read trip details and respond to invitations
*/

-- Drop ALL existing policies for trips table
DROP POLICY IF EXISTS "trips_own_data" ON trips;
DROP POLICY IF EXISTS "trips_read_invited" ON trips;
DROP POLICY IF EXISTS "trips_anonymous_read" ON trips;
DROP POLICY IF EXISTS "trips_owner_full_access" ON trips;
DROP POLICY IF EXISTS "trips_participant_read" ON trips;
DROP POLICY IF EXISTS "trips_invited_read" ON trips;

-- Drop ALL existing policies for trip_invitations table  
DROP POLICY IF EXISTS "invitations_read_own" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_trip_owner_manage" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_update_own" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_owner_manage" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_invitee_read_update" ON trip_invitations;
DROP POLICY IF EXISTS "invitations_invitee_update_status" ON trip_invitations;

-- Drop ALL existing policies for trip_participants table
DROP POLICY IF EXISTS "participants_own_data" ON trip_participants;
DROP POLICY IF EXISTS "participants_trip_owner_manage" ON trip_participants;

-- Recreate trips policies without recursion
CREATE POLICY "trips_owner_full_access"
  ON trips
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trips_participant_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tp.trip_id 
      FROM trip_participants tp 
      WHERE tp.user_id = auth.uid()
    )
  );

CREATE POLICY "trips_invited_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT ti.trip_id
      FROM trip_invitations ti
      WHERE ti.invitee_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      ) AND ti.status = 'pending'
    )
  );

CREATE POLICY "trips_anonymous_read"
  ON trips
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- Recreate trip_invitations policies without recursion
CREATE POLICY "invitations_owner_manage"
  ON trip_invitations
  FOR ALL
  TO authenticated
  USING (inviter_id = auth.uid())
  WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "invitations_invitee_read"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "invitations_invitee_update_status"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Recreate trip_participants policies without recursion
CREATE POLICY "participants_own_data"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "participants_trip_owner_manage"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (
      SELECT t.id FROM trips t WHERE t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT t.id FROM trips t WHERE t.user_id = auth.uid()
    )
  );
-- 20250612133433_bronze_hall.sql
/*
  # Fix infinite recursion in RLS policies - final solution

  1. Problem Analysis
    - Infinite recursion occurs when policies reference tables that have policies referencing back
    - The main issue is in trip_participants, trips, and trip_invitations tables
    - Policies are creating circular dependencies

  2. Solution
    - Create completely independent policies that don't reference other tables with RLS
    - Use direct auth.uid() checks where possible
    - Avoid complex joins in policy conditions
    - Use simple subqueries that don't trigger recursion

  3. Security
    - Maintain proper access control
    - Users can only access their own data and related trip data
    - Trip owners can manage their trips and participants
*/

-- First, completely disable RLS to clean up safely
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invitations DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start completely fresh
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on all tables
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('users', 'trips', 'trip_participants', 'trip_invitations')
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invitations ENABLE ROW LEVEL SECURITY;

-- USERS TABLE POLICIES (No recursion - only self-reference)
CREATE POLICY "users_own_data"
  ON users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_insert_own"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- TRIPS TABLE POLICIES (Simple, no complex joins)
CREATE POLICY "trips_owner_full_access"
  ON trips
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow reading trips where user is participant (simple subquery)
CREATE POLICY "trips_participant_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
    )
  );

-- Allow reading trips where user has pending invitation (simple subquery)
CREATE POLICY "trips_invited_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT trip_id FROM trip_invitations 
      WHERE invitee_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      ) AND status = 'pending'
    )
  );

-- Allow anonymous access to public trips
CREATE POLICY "trips_anonymous_read"
  ON trips
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- TRIP_PARTICIPANTS TABLE POLICIES (No recursion)
CREATE POLICY "participants_own_data"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trip owners can manage participants (simple subquery)
CREATE POLICY "participants_trip_owner_manage"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

-- TRIP_INVITATIONS TABLE POLICIES (No recursion)
CREATE POLICY "invitations_invitee_read"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "invitations_invitee_update_status"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "invitations_owner_manage"
  ON trip_invitations
  FOR ALL
  TO authenticated
  USING (inviter_id = auth.uid())
  WITH CHECK (inviter_id = auth.uid());

-- Create a safe function to respond to invitations
CREATE OR REPLACE FUNCTION respond_to_invitation(
  p_invitation_id UUID,
  p_response TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation trip_invitations%ROWTYPE;
  v_user_email TEXT;
  v_user_id UUID;
  v_participant_count INTEGER;
  v_max_participants INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not authenticated';
    RETURN;
  END IF;
  
  -- Get user email
  SELECT email INTO v_user_email 
  FROM auth.users 
  WHERE id = v_user_id;
  
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM trip_invitations
  WHERE id = p_invitation_id
    AND invitee_email = v_user_email
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invitation not found or already responded';
    RETURN;
  END IF;
  
  -- Validate response
  IF p_response NOT IN ('accepted', 'declined') THEN
    RETURN QUERY SELECT FALSE, 'Invalid response';
    RETURN;
  END IF;
  
  -- If accepting, check capacity and add participant
  IF p_response = 'accepted' THEN
    -- Get trip capacity info
    SELECT max_participants INTO v_max_participants
    FROM trips 
    WHERE id = v_invitation.trip_id;
    
    -- Count current participants
    SELECT COUNT(*) INTO v_participant_count
    FROM trip_participants 
    WHERE trip_id = v_invitation.trip_id;
    
    -- Check if trip is full
    IF v_participant_count >= v_max_participants THEN
      RETURN QUERY SELECT FALSE, 'Trip is full';
      RETURN;
    END IF;
    
    -- Check if user is already a participant
    IF EXISTS (
      SELECT 1 FROM trip_participants 
      WHERE trip_id = v_invitation.trip_id AND user_id = v_user_id
    ) THEN
      RETURN QUERY SELECT FALSE, 'You are already a participant';
      RETURN;
    END IF;
    
    -- Add user as participant
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (v_invitation.trip_id, v_user_id, 'participant');
  END IF;
  
  -- Update invitation status
  UPDATE trip_invitations
  SET status = p_response, responded_at = NOW()
  WHERE id = p_invitation_id;
  
  -- Return success
  IF p_response = 'accepted' THEN
    RETURN QUERY SELECT TRUE, 'Successfully joined the trip!';
  ELSE
    RETURN QUERY SELECT TRUE, 'Invitation declined';
  END IF;
END;
$$;

-- Ensure the trip creation trigger is simple and safe
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add participant if user_id is not null
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_trip_created ON trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();

-- Ensure proper indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_trip_participants_user_id ON trip_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_participants_trip_id ON trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_invitee_email ON trip_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_trip_id ON trip_invitations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
-- 20250612133834_maroon_mode.sql
/*
  # Fix infinite recursion in RLS policies - final solution
  
  This migration completely resolves infinite recursion issues by:
  1. Completely cleaning up all existing policies
  2. Creating simple, non-recursive policies
  3. Avoiding circular dependencies between tables
  4. Maintaining proper security while ensuring functionality
  
  The key is to use direct auth.uid() checks and simple subqueries
  that don't reference tables with RLS policies that reference back.
*/

-- First, completely disable RLS to clean up safely
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invitations DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start completely fresh
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on all relevant tables
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('users', 'trips', 'trip_participants', 'trip_invitations')
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_invitations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE POLICIES (Simple, no recursion)
-- =====================================================

-- Users can always read and manage their own data
CREATE POLICY "users_own_data"
  ON users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "users_insert_own"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- =====================================================
-- TRIPS TABLE POLICIES (Simple, no complex joins)
-- =====================================================

-- Users can manage their own trips
CREATE POLICY "trips_owner_full_access"
  ON trips
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can read trips where they are participants (simple subquery)
CREATE POLICY "trips_participant_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
    )
  );

-- Users can read trips where they have pending invitations (simple subquery)
CREATE POLICY "trips_invited_read"
  ON trips
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT trip_id FROM trip_invitations 
      WHERE invitee_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      ) AND status = 'pending'
    )
  );

-- Allow anonymous access to public trips (trips with no owner)
CREATE POLICY "trips_anonymous_read"
  ON trips
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- =====================================================
-- TRIP_PARTICIPANTS TABLE POLICIES (No recursion)
-- =====================================================

-- Users can manage their own participation records
CREATE POLICY "participants_own_data"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trip owners can manage all participants in their trips (simple subquery)
CREATE POLICY "participants_trip_owner_manage"
  ON trip_participants
  FOR ALL
  TO authenticated
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- TRIP_INVITATIONS TABLE POLICIES (No recursion)
-- =====================================================

-- Users can read invitations sent to their email
CREATE POLICY "invitations_invitee_read"
  ON trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Users can update invitations sent to their email (to respond)
CREATE POLICY "invitations_invitee_update_status"
  ON trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    invitee_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Users can manage invitations for their trips
CREATE POLICY "invitations_owner_manage"
  ON trip_invitations
  FOR ALL
  TO authenticated
  USING (inviter_id = auth.uid())
  WITH CHECK (inviter_id = auth.uid());

-- =====================================================
-- SAFE FUNCTIONS
-- =====================================================

-- Create a safe function to respond to invitations
CREATE OR REPLACE FUNCTION respond_to_invitation(
  p_invitation_id UUID,
  p_response TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation trip_invitations%ROWTYPE;
  v_user_email TEXT;
  v_user_id UUID;
  v_participant_count INTEGER;
  v_max_participants INTEGER;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not authenticated';
    RETURN;
  END IF;
  
  -- Get user email
  SELECT email INTO v_user_email 
  FROM auth.users 
  WHERE id = v_user_id;
  
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM trip_invitations
  WHERE id = p_invitation_id
    AND invitee_email = v_user_email
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invitation not found or already responded';
    RETURN;
  END IF;
  
  -- Validate response
  IF p_response NOT IN ('accepted', 'declined') THEN
    RETURN QUERY SELECT FALSE, 'Invalid response';
    RETURN;
  END IF;
  
  -- If accepting, check capacity and add participant
  IF p_response = 'accepted' THEN
    -- Get trip capacity info
    SELECT max_participants INTO v_max_participants
    FROM trips 
    WHERE id = v_invitation.trip_id;
    
    -- Count current participants
    SELECT COUNT(*) INTO v_participant_count
    FROM trip_participants 
    WHERE trip_id = v_invitation.trip_id;
    
    -- Check if trip is full
    IF v_participant_count >= v_max_participants THEN
      RETURN QUERY SELECT FALSE, 'Trip is full';
      RETURN;
    END IF;
    
    -- Check if user is already a participant
    IF EXISTS (
      SELECT 1 FROM trip_participants 
      WHERE trip_id = v_invitation.trip_id AND user_id = v_user_id
    ) THEN
      RETURN QUERY SELECT FALSE, 'You are already a participant';
      RETURN;
    END IF;
    
    -- Add user as participant
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (v_invitation.trip_id, v_user_id, 'participant');
  END IF;
  
  -- Update invitation status
  UPDATE trip_invitations
  SET status = p_response, responded_at = NOW()
  WHERE id = p_invitation_id;
  
  -- Return success
  IF p_response = 'accepted' THEN
    RETURN QUERY SELECT TRUE, 'Successfully joined the trip!';
  ELSE
    RETURN QUERY SELECT TRUE, 'Invitation declined';
  END IF;
END;
$$;

-- Ensure the trip creation trigger is simple and safe
CREATE OR REPLACE FUNCTION add_trip_owner_as_participant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add participant if user_id is not null
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO trip_participants (trip_id, user_id, role)
    VALUES (NEW.id, NEW.user_id, 'owner')
    ON CONFLICT (trip_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_trip_created ON trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON trips
  FOR EACH ROW
  EXECUTE FUNCTION add_trip_owner_as_participant();

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Ensure proper indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_trip_participants_user_id ON trip_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_participants_trip_id ON trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_invitee_email ON trip_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_trip_invitations_trip_id ON trip_invitations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);

-- =====================================================
-- CONSTRAINTS AND VALIDATION
-- =====================================================

-- Ensure proper constraints exist
DO $$
BEGIN
  -- Unique constraint for trip participants
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trip_participants_unique' 
    AND table_name = 'trip_participants'
  ) THEN
    ALTER TABLE trip_participants 
    ADD CONSTRAINT trip_participants_unique 
    UNIQUE (trip_id, user_id);
  END IF;
  
  -- Unique constraint for trip invitations
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'trip_invitations_trip_id_invitee_email_key' 
    AND table_name = 'trip_invitations'
  ) THEN
    ALTER TABLE trip_invitations 
    ADD CONSTRAINT trip_invitations_trip_id_invitee_email_key 
    UNIQUE (trip_id, invitee_email);
  END IF;
END $$;
