
/*
  Supabase Schema: Checklist Feature + Auto Default Items for Tripp'it
*/

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

-- RLS Policy
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

-- Default Checklist Item Seeder
CREATE OR REPLACE FUNCTION create_default_checklist_items(p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO checklist_items (user_id, category, description, is_default)
  VALUES
    -- Essentials
    (p_user_id, '📄 Essentials', 'Passport (valid at least 6 months)', true),
    (p_user_id, '📄 Essentials', 'Visa (if required)', true),
    (p_user_id, '📄 Essentials', 'Flight tickets (downloaded + printed)', true),
    (p_user_id, '📄 Essentials', 'Accommodation booked', true),
    (p_user_id, '📄 Essentials', 'Itinerary saved offline', true),
    (p_user_id, '📄 Essentials', 'Travel insurance confirmation', true),
    (p_user_id, '📄 Essentials', 'Local currency or travel card', true),
    (p_user_id, '📄 Essentials', 'Emergency contacts list', true),
    -- Packing
    (p_user_id, '🧳 Packing', 'Clothes (based on weather)', true),
    (p_user_id, '🧳 Packing', 'Toiletries', true),
    (p_user_id, '🧳 Packing', 'Medication + prescriptions', true),
    (p_user_id, '🧳 Packing', 'Chargers + power bank', true),
    (p_user_id, '🧳 Packing', 'Adapter (check plug type)', true),
    (p_user_id, '🧳 Packing', 'Reusable water bottle', true),
    (p_user_id, '🧳 Packing', 'Travel pillow or blanket', true),
    -- Smart Prep
    (p_user_id, '🧠 Smart Prep', 'Download offline maps (Google Maps, Maps.me)', true),
    (p_user_id, '🧠 Smart Prep', 'Translate key phrases in local language', true),
    (p_user_id, '🧠 Smart Prep', 'Screenshot/print booking confirmations', true),
    (p_user_id, '🧠 Smart Prep', 'Check baggage limits', true),
    (p_user_id, '🧠 Smart Prep', 'Inform your bank of travel (to avoid card blocks)', true),
    -- Digital Tools
    (p_user_id, '📱 Digital Tools', 'SIM card or eSIM setup', true),
    (p_user_id, '📱 Digital Tools', 'Installed must-have apps (e.g. Grab, Google Translate, XE, etc.)', true),
    (p_user_id, '📱 Digital Tools', 'Backup important docs to cloud or USB', true),
    (p_user_id, '📱 Digital Tools', 'Download entertainment for the flight', true);
END;
$$ LANGUAGE plpgsql;

-- Create Trigger for New Users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  PERFORM create_default_checklist_items(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
