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