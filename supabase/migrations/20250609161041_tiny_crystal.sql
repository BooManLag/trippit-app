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