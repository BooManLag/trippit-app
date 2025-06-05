/*
  # Add Checklist System

  1. Changes
    - Remove badges and user_badges tables
    - Add checklist_items table for user checklists
    - Add default checklist items

  2. Security
    - Enable RLS on checklist_items table
    - Add policies for authenticated users
*/

-- Drop existing badge-related tables
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;

-- Create checklist_items table
CREATE TABLE IF NOT EXISTS checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  is_completed boolean DEFAULT false,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can manage their checklist items"
  ON checklist_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert default checklist items function
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