/*
  # Add checklist trigger

  1. Changes
    - Add trigger to create default checklist items on user creation
    - Update checklist_items table to handle anonymous users
*/

-- Allow anonymous users to have checklist items
ALTER TABLE checklist_items ALTER COLUMN user_id DROP NOT NULL;

-- Create trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create default checklist items for the new user
  PERFORM create_default_checklist_items(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Add policy for anonymous users
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

-- Insert default checklist items for anonymous users
INSERT INTO checklist_items (category, description, is_default)
SELECT category, description, is_default
FROM (
  SELECT '📄 Essentials' as category, unnest(ARRAY[
    'Passport (valid at least 6 months)',
    'Visa (if required)',
    'Flight tickets (downloaded + printed)',
    'Accommodation booked',
    'Itinerary saved offline',
    'Travel insurance confirmation',
    'Local currency or travel card',
    'Emergency contacts list'
  ]) as description, true as is_default
  UNION ALL
  SELECT '🧳 Packing', unnest(ARRAY[
    'Clothes (based on weather)',
    'Toiletries',
    'Medication + prescriptions',
    'Chargers + power bank',
    'Adapter (check plug type)',
    'Reusable water bottle',
    'Travel pillow or blanket'
  ]), true
  UNION ALL
  SELECT '🧠 Smart Prep', unnest(ARRAY[
    'Download offline maps (Google Maps, Maps.me)',
    'Translate key phrases in local language',
    'Screenshot/print booking confirmations',
    'Check baggage limits',
    'Inform your bank of travel (to avoid card blocks)'
  ]), true
  UNION ALL
  SELECT '📱 Digital Tools', unnest(ARRAY[
    'SIM card or eSIM setup',
    'Installed must-have apps (e.g. Grab, Google Translate, XE, etc.)',
    'Backup important docs to cloud or USB',
    'Download entertainment for the flight'
  ]), true
) t
WHERE NOT EXISTS (
  SELECT 1 FROM checklist_items WHERE user_id IS NULL AND is_default = true
);