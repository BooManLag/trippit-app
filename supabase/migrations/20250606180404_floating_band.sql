/*
  # Create default bucket list items function

  1. New Functions
    - `create_default_bucket_list_items` - Creates default bucket list items for a trip
      - Takes destination, trip_id, and user_id as parameters
      - Generates curated bucket list items based on destination
      - Returns void

  2. Purpose
    - Automatically populate bucket list items when a user visits their trip dashboard
    - Provides engaging, destination-specific activities
    - Ensures users always have some bucket list items to start with
*/

CREATE OR REPLACE FUNCTION public.create_default_bucket_list_items(
  p_destination text,
  p_trip_id uuid,
  p_user_id uuid
)
RETURNS void AS $$
DECLARE
  city_name text;
  country_name text;
  default_items text[][] := ARRAY[
    ARRAY['Explore the historic center', 'Walk through the historic heart and discover architectural gems', 'Sightseeing'],
    ARRAY['Try authentic local cuisine', 'Sample traditional dishes this destination is famous for', 'Food & Drink'],
    ARRAY['Visit a local market', 'Experience the vibrant atmosphere of local markets', 'Culture'],
    ARRAY['Take photos at iconic landmarks', 'Capture memories at the most recognizable spots', 'Photography'],
    ARRAY['Learn basic local phrases', 'Connect with locals by learning key phrases', 'Culture'],
    ARRAY['Find a hidden local gem', 'Discover a place locals love but tourists rarely find', 'Local Life'],
    ARRAY['Experience local transportation', 'Master the art of getting around like a local', 'Adventure'],
    ARRAY['Attend a cultural event', 'Join in local festivals, markets, or gatherings', 'Culture'],
    ARRAY['Try street food', 'Be adventurous with local street vendors and food stalls', 'Food & Drink'],
    ARRAY['Make a local friend', 'Strike up a conversation and connect with someone local', 'Experience']
  ];
  item_record text[];
BEGIN
  -- Extract city and country from destination
  IF position(',' in p_destination) > 0 THEN
    city_name := trim(split_part(p_destination, ',', 1));
    country_name := trim(split_part(p_destination, ',', 2));
  ELSE
    city_name := p_destination;
    country_name := p_destination;
  END IF;

  -- Insert default bucket list items
  FOREACH item_record SLICE 1 IN ARRAY default_items
  LOOP
    INSERT INTO bucket_list_items (
      user_id,
      trip_id,
      title,
      description,
      category,
      is_completed
    ) VALUES (
      p_user_id,
      p_trip_id,
      replace(item_record[1], 'this destination', city_name),
      replace(replace(item_record[2], 'this destination', city_name), 'local', city_name || ' local'),
      item_record[3],
      false
    );
  END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;