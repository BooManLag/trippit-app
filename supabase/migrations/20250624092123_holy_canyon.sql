-- Create post_reactions table
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('star', 'shit')),
  created_at timestamptz DEFAULT now(),
  
  -- Each user can only have one reaction per post
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_reactions
CREATE POLICY "Users can manage their own reactions"
  ON public.post_reactions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Everyone can read reactions"
  ON public.post_reactions
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_post ON public.post_reactions(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_type ON public.post_reactions(reaction_type);

-- Create function to get reaction counts for a post
CREATE OR REPLACE FUNCTION get_post_reactions(p_post_id uuid)
RETURNS TABLE (
  stars_count bigint,
  shits_count bigint,
  total_count bigint,
  star_percentage numeric,
  shit_percentage numeric,
  user_reaction text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stars bigint;
  v_shits bigint;
  v_total bigint;
  v_user_reaction text;
BEGIN
  -- Get star count
  SELECT COUNT(*) INTO v_stars
  FROM post_reactions
  WHERE post_id = p_post_id AND reaction_type = 'star';
  
  -- Get shit count
  SELECT COUNT(*) INTO v_shits
  FROM post_reactions
  WHERE post_id = p_post_id AND reaction_type = 'shit';
  
  -- Calculate total
  v_total := v_stars + v_shits;
  
  -- Get current user's reaction if authenticated
  IF auth.uid() IS NOT NULL THEN
    SELECT reaction_type INTO v_user_reaction
    FROM post_reactions
    WHERE post_id = p_post_id AND user_id = auth.uid();
  END IF;
  
  -- Return the counts and percentages
  RETURN QUERY
  SELECT 
    v_stars AS stars_count,
    v_shits AS shits_count,
    v_total AS total_count,
    CASE WHEN v_total > 0 THEN ROUND((v_stars::numeric / v_total) * 100, 1) ELSE 0 END AS star_percentage,
    CASE WHEN v_total > 0 THEN ROUND((v_shits::numeric / v_total) * 100, 1) ELSE 0 END AS shit_percentage,
    v_user_reaction AS user_reaction;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_post_reactions(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_post_reactions(uuid) IS
  'Returns reaction counts and percentages for a post, including the current user''s reaction if authenticated';