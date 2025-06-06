-- Update the function to create randomized bucket list items from our 30+ collection
CREATE OR REPLACE FUNCTION create_default_bucket_list_items(p_user_id uuid, p_trip_id uuid, p_destination text)
RETURNS void AS $$
DECLARE
  city_name text;
  country_name text;
  bucket_items text[][] := ARRAY[
    ['Eat Something Wildly Local (Without Googling First)', 'Order the most mysterious-looking street food you can find. Embrace the unknown flavors!', 'Food & Drink'],
    ['Learn & Use a Local Slang Phrase in Public', 'Ask a local for a funny expression. Drop it into conversation at least once—bonus points for pronunciation!', 'Culture'],
    ['Improvise a Local Dance Move on the Street', 'Find a busy plaza, drop coins for street musicians, and bust out your best traditional dance attempt!', 'Culture'],
    ['Make One "100% Tourist" Photo—Pridefully', 'Pose in front of the biggest cliché landmark with goofy props or dramatic pose. No shame—only glory!', 'Photography'],
    ['Challenge a Stranger to a Mini Talent Swap', 'Teach someone a party trick, ask them to teach you something local—song snippet, hand gesture, etc.', 'Local Life'],
    ['Use Public Transport in "Stealth Mode"', 'Ride local transport without studying routes—just hop on and ask "is this going downtown?"', 'Adventure'],
    ['Find & Photograph the Hackiest Tourist Souvenir', 'Seek out the most bizarre magnet or keychain that screams "tourist." Wear/use it for a day!', 'Shopping'],
    ['Crash a Local Gathering (Festival, Market, etc.)', 'Spot a public festival or lively market—step in, join the circle, and participate for five minutes.', 'Local Life'],
    ['Barter Like a Boss', 'At a market stall, negotiate a discount on something you don''t need. Aim for at least 20% off!', 'Shopping'],
    ['Speak Only in Questions for 10 Minutes', 'Challenge yourself to ask every sentence as a question and see how locals react.', 'Culture'],
    ['Send a Postcard to Yourself with Tomorrow''s Challenge', 'Write "Try the spiciest local snack tomorrow!" and mail it. Hilarious reminder when it arrives home!', 'Experience'],
    ['Attempt at Least One Local "Extreme" Activity', 'Zip-lining? Sandboarding? Even if mild back home, try the local version!', 'Adventure'],
    ['Learn One Traditional Toast & Down a Local Drink', 'Ask for their classic "cheers" toast, sample their favorite beverage, perform it in native language.', 'Food & Drink'],
    ['Perform a Random Act of "Tourist Kindness"', 'Buy coffee for a stranger, help carry groceries, or feed pigeons—spread good tourist vibes!', 'Experience'],
    ['Discover & Share a Local "Spooky Legend"', 'Research a ghost story or urban legend. Whisper it dramatically to friends at night!', 'Culture'],
    ['Get a Local to Teach You a Secret Greeting', 'Learn a special handshake or greeting. Use it at least three times before leaving!', 'Local Life'],
    ['Attempt Phrasebook Karaoke', 'Find a popular local song, grab lyrics, and film yourself singing it—off-key encouraged!', 'Entertainment'],
    ['Eat Dessert First—Local Style', 'Order the sweetest street dessert as your very first bite of the day, then proceed normally.', 'Food & Drink'],
    ['Snap a Selfie Mimicking a Local Icon', 'Find a statue or mural, strike a pose that mimics it, embrace the cheesy matching moment.', 'Photography'],
    ['Leave Your Mark (Respectfully)', 'Use washable chalk to draw a tiny doodle on a permitted spot as your "tourist signature."', 'Experience'],
    ['Master the Art of Local Coffee Ordering', 'Learn exactly how locals order their morning coffee. Nail the pronunciation and etiquette.', 'Food & Drink'],
    ['Find the Best Local Sunset/Sunrise Spot', 'Ask three different locals for their favorite golden hour location. Visit the most recommended.', 'Nature'],
    ['Attend a Local Sports Event or Match', 'Experience the passion of local sports culture—even if you don''t understand the rules!', 'Entertainment'],
    ['Navigate Using Only Landmark Directions', 'Ask for directions using only landmarks ("turn left at the big tree") instead of street names.', 'Adventure'],
    ['Try a Local Wellness or Spa Tradition', 'Experience traditional baths, massage styles, or wellness practices unique to the region.', 'Wellness'],
    ['Photograph 5 Different Local Door Styles', 'Capture the unique architectural personality of the place through its diverse doorways.', 'Photography'],
    ['Learn to Cook One Local Dish', 'Take a cooking class or convince a local to teach you their family recipe.', 'Food & Drink'],
    ['Experience Local Nightlife Like a Resident', 'Ask locals where THEY go for fun at night—avoid tourist traps, find authentic spots.', 'Nightlife'],
    ['Collect Sounds of the City', 'Record 1-minute audio clips of unique local sounds—markets, music, street calls, nature.', 'Experience'],
    ['Find the Oldest Thing in the City', 'Hunt down the most ancient building, tree, or artifact. Learn its story.', 'Culture'],
    ['Master Local Public Transport Etiquette', 'Learn the unwritten rules—where to stand, how to pay, what''s considered polite.', 'Local Life'],
    ['Discover a Hidden Local Gem', 'Find a place that''s not in guidebooks but locals love—ask "where do you go to relax?"', 'Sightseeing'],
    ['Experience Local Weather Like a Pro', 'Learn how locals dress and behave in their typical weather. Adapt your style accordingly.', 'Local Life'],
    ['Find the Best Local Viewpoint', 'Discover where locals go for the best city views—not necessarily the most famous tourist spot.', 'Nature'],
    ['Learn a Traditional Local Game', 'Find locals playing cards, board games, or street games. Ask them to teach you!', 'Entertainment']
  ];
  shuffled_items text[][];
  i integer;
  j integer;
  temp text[];
BEGIN
  -- Extract city and country from destination
  SELECT split_part(p_destination, ', ', 1) INTO city_name;
  SELECT split_part(p_destination, ', ', 2) INTO country_name;
  
  -- Shuffle the array using Fisher-Yates algorithm
  shuffled_items := bucket_items;
  FOR i IN REVERSE array_length(shuffled_items, 1)..2 LOOP
    j := floor(random() * i + 1)::integer;
    temp := shuffled_items[i];
    shuffled_items[i] := shuffled_items[j];
    shuffled_items[j] := temp;
  END LOOP;
  
  -- Insert first 8 randomized bucket list items
  FOR i IN 1..LEAST(8, array_length(shuffled_items, 1)) LOOP
    INSERT INTO bucket_list_items (user_id, trip_id, title, description, category)
    VALUES (p_user_id, p_trip_id, shuffled_items[i][1], shuffled_items[i][2], shuffled_items[i][3]);
  END LOOP;
END;
$$ LANGUAGE plpgsql;