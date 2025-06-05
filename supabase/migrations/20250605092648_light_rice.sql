/*
  # Add Adventure Tracking and Default Checklist Items

  1. Changes
    - Make user_id nullable in checklist_items table
    - Add policies for anonymous users
    - Add default checklist items for both authenticated and anonymous users
    - Add trigger for new user registration

  2. Security
    - Maintain RLS on checklist_items table
    - Add policies for anonymous access
*/

-- Allow anonymous users to have checklist items
ALTER TABLE checklist_items ALTER COLUMN user_id DROP NOT NULL;

-- Add RLS policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'checklist_items' 
    AND policyname = 'Users can manage their checklist items'
  ) THEN
    CREATE POLICY "Users can manage their checklist items"
      ON checklist_items
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Add policies for anonymous users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'checklist_items' 
    AND policyname = 'Allow anonymous checklist creation'
  ) THEN
    CREATE POLICY "Allow anonymous checklist creation"
      ON checklist_items
      FOR INSERT
      TO anon
      WITH CHECK (user_id IS NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'checklist_items' 
    AND policyname = 'Allow anonymous checklist reading'
  ) THEN
    CREATE POLICY "Allow anonymous checklist reading"
      ON checklist_items
      FOR SELECT
      TO anon
      USING (user_id IS NULL);
  END IF;
END $$;

-- Create function to insert default checklist items
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

-- Create trigger to add default items for new users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;

-- Insert default checklist items for anonymous users if they don't exist
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