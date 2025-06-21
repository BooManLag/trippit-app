/*
  # Travel Diary Feature

  1. New Tables
    - `diary_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `trip_id` (uuid, foreign key to trips)
      - `day_number` (integer, day of the trip)
      - `entry_date` (date, actual calendar date)
      - `title` (text, optional title for the day)
      - `content` (text, diary entry content)
      - `mood` (text, optional mood indicator)
      - `weather` (text, optional weather note)
      - `location` (text, optional location for the day)
      - `photos` (text array, optional photo URLs)
      - `is_published` (boolean, whether entry is shared with trip participants)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `diary_entries` table
    - Add policies for users to manage their own entries
    - Add policies for trip participants to read published entries
*/

-- Create diary entries table
CREATE TABLE IF NOT EXISTS public.diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  day_number integer NOT NULL,
  entry_date date NOT NULL,
  title text DEFAULT '',
  content text NOT NULL,
  mood text DEFAULT '',
  weather text DEFAULT '',
  location text DEFAULT '',
  photos text[] DEFAULT '{}',
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, trip_id, day_number)
);

-- Enable RLS
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for diary_entries
-- Users can manage their own diary entries
CREATE POLICY "Users can manage own diary entries"
  ON public.diary_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trip participants can read published diary entries
CREATE POLICY "Trip participants can read published entries"
  ON public.diary_entries
  FOR SELECT
  TO authenticated
  USING (
    is_published = true
    AND (
      trip_id IN (
        SELECT id FROM trips WHERE user_id = auth.uid()
        UNION
        SELECT trip_id FROM trip_participants WHERE user_id = auth.uid()
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_trip ON public.diary_entries(user_id, trip_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_trip_published ON public.diary_entries(trip_id, is_published);
CREATE INDEX IF NOT EXISTS idx_diary_entries_day_number ON public.diary_entries(trip_id, day_number);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_diary_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_diary_entries_updated_at
  BEFORE UPDATE ON public.diary_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_diary_entries_updated_at();