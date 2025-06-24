/*
  # City Visits View for Pee Chart

  1. New View
    - `city_visits` - Aggregates trip data by city and country
    - Counts number of trips started in each location
    - Used by the Trippit Pee Chart feature

  2. Functions
    - `increment_city_visit` - Increments the visit count for a city
    - Called by the log_visit edge function when trips are created

  3. Security
    - Enable RLS on the view
    - Allow authenticated users to read the data
    - Allow service role to update the data
*/

-- Create city_visits view if it doesn't exist
CREATE TABLE IF NOT EXISTS public.city_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  country text NOT NULL,
  trip_count integer NOT NULL DEFAULT 1,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(city, country)
);

-- Enable RLS
ALTER TABLE public.city_visits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow reading city_visits"
  ON public.city_visits
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Allow service role to manage city_visits"
  ON public.city_visits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create or replace the increment function
CREATE OR REPLACE FUNCTION public.increment_city_visit(p_city text, p_country text)
RETURNS SETOF public.city_visits
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.city_visits (city, country, trip_count)
  VALUES (p_city, p_country, 1)
  ON CONFLICT (city, country)
  DO UPDATE SET 
    trip_count = city_visits.trip_count + 1,
    updated_at = now()
  RETURNING *;
END;
$$;

-- Grant permissions
GRANT SELECT ON public.city_visits TO anon, authenticated;
GRANT ALL ON public.city_visits TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_city_visit TO service_role;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_city_visits_city_country ON public.city_visits(city, country);
CREATE INDEX IF NOT EXISTS idx_city_visits_trip_count ON public.city_visits(trip_count DESC);