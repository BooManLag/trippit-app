/*
  # Badge System Implementation

  1. New Tables
    - `badges` - Master list of all available badges
    - `user_badges` - Track which badges users have earned
    - `badge_progress` - Track progress towards badges that require multiple actions

  2. Badge Categories
    - Dare Bucket List Achievements
    - Tips Page Achievements  
    - Checklist Achievements
    - Invite/Friends Achievements
    - Milestone + Combo Achievements

  3. Security
    - Enable RLS on all badge tables
    - Add policies for users to read badges and their own progress
    - Add policies for the system to award badges
*/

-- Create badges master table
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  emoji text NOT NULL,
  category text NOT NULL,
  requirement_type text NOT NULL, -- 'count', 'boolean', 'combo'
  requirement_value integer DEFAULT 1,
  is_per_trip boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create user badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  badge_id uuid REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  progress_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_id, trip_id)
);

-- Create badge progress tracking table
CREATE TABLE IF NOT EXISTS public.badge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  badge_key text NOT NULL,
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  current_count integer DEFAULT 0,
  target_count integer NOT NULL,
  progress_data jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_key, trip_id)
);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badges (everyone can read)
CREATE POLICY "Everyone can read badges"
  ON public.badges
  FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for user_badges
CREATE POLICY "Users can read own badges"
  ON public.user_badges
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can award badges"
  ON public.user_badges
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for badge_progress
CREATE POLICY "Users can read own progress"
  ON public.badge_progress
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own progress"
  ON public.badge_progress
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Insert all badge definitions
INSERT INTO public.badges (badge_key, name, description, emoji, category, requirement_type, requirement_value, is_per_trip) VALUES
-- Dare Bucket List Achievements
('daredevil', 'Daredevil', 'Complete your first Dare on a trip', '🎯', 'Dare Bucket List', 'count', 1, true),
('on_a_roll', 'On a Roll', 'Complete 3 Dares on the same trip', '🔥', 'Dare Bucket List', 'count', 3, true),
('bucket_champion', 'Bucket Champion', 'Finish 5 Dares on a single trip', '🏆', 'Dare Bucket List', 'count', 5, true),
('bucket_legend', 'Bucket Legend', 'Finish all available Dares on a trip', '🌟', 'Dare Bucket List', 'boolean', 1, true),
('no_fear', 'No Fear', 'Complete the boldest Dare of the trip', '😎', 'Dare Bucket List', 'boolean', 1, true),

-- Tips Page Achievements
('pro_tipster', 'Pro Tipster', 'Add your first tip during a trip', '💡', 'Tips Page', 'count', 1, true),
('tip_guru', 'Tip Guru', 'Share 5 tips during one trip', '📘', 'Tips Page', 'count', 5, true),
('wander_wise', 'Wander Wise', 'A tip you posted gets saved by 3 or more users on the same trip', '🧭', 'Tips Page', 'count', 3, true),
('globe_advisor', 'Globe Advisor', 'Post tips for 3 or more locations within a single trip', '🗺️', 'Tips Page', 'count', 3, true),

-- Checklist Achievements
('checklist_conqueror', 'Checklist Conqueror', 'Complete your first checklist on a trip', '✔️', 'Checklist', 'boolean', 1, true),
('checklist_master', 'Checklist Master', 'Complete 5 checklists on separate trips', '📋', 'Checklist', 'count', 5, false),
('detail_oriented', 'Detail-Oriented', 'Create a checklist with 15 or more items on a trip', '🧐', 'Checklist', 'count', 15, true),
('prepared_pro', 'Prepared Pro', 'Finish your checklist 3 days before your trip starts', '🧳', 'Checklist', 'boolean', 1, true),

-- Invite/Friends Achievements
('social_explorer', 'Social Explorer', 'Invite your first friend on the trip', '🤝', 'Invite/Friends', 'count', 1, true),
('travel_crew', 'Travel Crew', 'Invite 3 friends on the same trip', '👥', 'Invite/Friends', 'count', 3, true),
('squad_goals', 'Squad Goals', 'Have at least 3 invited friends join the trip', '🫂', 'Invite/Friends', 'count', 3, true),
('referral_master', 'Referral Master', 'Have 5 friends sign up for the app via your invite on the trip', '📨', 'Invite/Friends', 'count', 5, true),

-- Milestone + Combo Achievements
('world_builder', 'World Builder', 'Complete at least 1 Dare, 1 Tip, 1 Checklist, and invite a friend on a single trip', '🌍', 'Milestone + Combo', 'combo', 1, true),
('frequent_flyer', 'Frequent Flyer', 'Complete 3 different trips on Trippit, earning badges for each one', '✈️', 'Milestone + Combo', 'count', 3, false),
('explorer_passport', 'Explorer''s Passport', 'Travel to 3 different countries and earn achievements for each trip', '🛂', 'Milestone + Combo', 'count', 3, false),
('night_owl', 'Night Owl', 'Update a checklist or tip after midnight during any trip', '🌙', 'Milestone + Combo', 'boolean', 1, true),
('streak_seeker', 'Streak Seeker', 'Use the app daily for 7 consecutive days while on a trip', '📆', 'Milestone + Combo', 'count', 7, true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_trip_id ON public.user_badges(trip_id);
CREATE INDEX IF NOT EXISTS idx_badge_progress_user_trip ON public.badge_progress(user_id, trip_id);
CREATE INDEX IF NOT EXISTS idx_badges_category ON public.badges(category);