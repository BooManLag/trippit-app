/*
  # Add foreign key relationship for badge progress

  1. Database Changes
    - Add foreign key constraint from badge_progress.badge_key to badges.badge_key
    - This enables the join query in badgeService.ts to work properly

  2. Security
    - Maintains existing RLS policies
    - No changes to access control
*/

-- Add foreign key constraint to link badge_progress to badges
ALTER TABLE public.badge_progress 
ADD CONSTRAINT badge_progress_badge_key_fkey 
FOREIGN KEY (badge_key) REFERENCES public.badges(badge_key) ON DELETE CASCADE;