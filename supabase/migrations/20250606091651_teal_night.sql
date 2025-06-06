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