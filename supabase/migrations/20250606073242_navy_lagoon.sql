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