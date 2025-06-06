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