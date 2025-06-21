/*
  # Row Level Security Policies

  1. Security Updates
    - Drop all existing policies to ensure clean slate
    - Create comprehensive, non-recursive policies for all tables
    - Enable RLS on all tables
    - Grant proper permissions

  2. Tables Updated
    - users: Allow reading all user profiles (needed for joins)
    - trips: Allow accessing owned/participated trips
    - trip_participants: Allow managing participation
    - trip_invitations: Allow managing sent/received invitations
    - checklist_items: Allow managing own items
    - bucket_list_items: Allow managing own items
    - user_bucket_progress: Allow managing own progress
    - destination_bucket_items: Allow reading all items
    - stories: Allow reading all, managing own
    - tips: Allow reading all
    - bucket_list: Allow reading all
    - user_bucket_items: Allow managing own items
    - tokens: Allow service role to manage tokens
*/

-- 1) DROP ALL existing policies to ensure clean slate

-- Drop ALL policies on users table
DO $$ 
DECLARE 
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', policy_name);
    END LOOP;
END $$;

-- Drop ALL policies on trips table
DO $$ 
DECLARE 
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'trips' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trips', policy_name);
    END LOOP;
END $$;

-- Drop ALL policies on trip_participants table
DO $$ 
DECLARE 
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'trip_participants' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trip_participants', policy_name);
    END LOOP;
END $$;

-- Drop ALL policies on trip_invitations table
DO $$ 
DECLARE 
    policy_name text;
BEGIN
    FOR policy_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'trip_invitations' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trip_invitations', policy_name);
    END LOOP;
END $$;

-- Drop ALL policies on other tables
DO $$ 
DECLARE 
    table_name text;
    policy_name text;
BEGIN
    FOR table_name IN VALUES ('checklist_items'), ('bucket_list_items'), ('user_bucket_progress'), 
                             ('destination_bucket_items'), ('stories'), ('tips'), ('bucket_list'), 
                             ('user_bucket_items'), ('tokens')
    LOOP
        FOR policy_name IN 
            SELECT policyname FROM pg_policies WHERE tablename = table_name AND schemaname = 'public'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
        END LOOP;
    END LOOP;
END $$;

-- 2) Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bucket_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bucket_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destination_bucket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bucket_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bucket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;

-- 3) Create new, non-recursive policies

-- USERS table policies
CREATE POLICY "users_own_data"
  ON public.users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_basic_read_for_invitations"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- TRIPS table policies
CREATE POLICY "trips_owner_access"
  ON public.trips
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "trips_participant_read"
  ON public.trips
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    auth.uid() = ANY(participant_ids)
  );

CREATE POLICY "trips_anonymous_read"
  ON public.trips
  FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- TRIP_PARTICIPANTS table policies
CREATE POLICY "participants_own_entries"
  ON public.trip_participants
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "participants_trip_context_read"
  ON public.trip_participants
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
    )
  );

-- TRIP_INVITATIONS table policies
CREATE POLICY "invitations_invitee_access"
  ON public.trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email = (auth.jwt() ->> 'email')::text
  );

CREATE POLICY "invitations_invitee_update"
  ON public.trip_invitations
  FOR UPDATE
  TO authenticated
  USING (
    invitee_email = (auth.jwt() ->> 'email')::text
  )
  WITH CHECK (
    invitee_email = (auth.jwt() ->> 'email')::text
  );

CREATE POLICY "invitations_owner_manage"
  ON public.trip_invitations
  FOR ALL
  TO authenticated
  USING (
    inviter_id = auth.uid()
  )
  WITH CHECK (
    inviter_id = auth.uid()
  );

-- CHECKLIST_ITEMS table policies
CREATE POLICY "checklist_items_user_access"
  ON public.checklist_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "checklist_items_anonymous_access"
  ON public.checklist_items
  FOR ALL
  TO anon
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

-- BUCKET_LIST_ITEMS table policies
CREATE POLICY "bucket_list_items_user_access"
  ON public.bucket_list_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- USER_BUCKET_PROGRESS table policies
CREATE POLICY "user_bucket_progress_access"
  ON public.user_bucket_progress
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DESTINATION_BUCKET_ITEMS table policies
CREATE POLICY "destination_bucket_items_read_all"
  ON public.destination_bucket_items
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- STORIES table policies
CREATE POLICY "stories_read_all"
  ON public.stories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "stories_user_manage"
  ON public.stories
  FOR INSERT, UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- TIPS table policies
CREATE POLICY "tips_read_all"
  ON public.tips
  FOR SELECT
  TO authenticated
  USING (true);

-- BUCKET_LIST table policies
CREATE POLICY "bucket_list_read_all"
  ON public.bucket_list
  FOR SELECT
  TO authenticated
  USING (true);

-- USER_BUCKET_ITEMS table policies
CREATE POLICY "user_bucket_items_access"
  ON public.user_bucket_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- TOKENS table policies
CREATE POLICY "tokens_service_role_access"
  ON public.tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4) Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bucket_list_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_bucket_progress TO authenticated;
GRANT SELECT ON public.destination_bucket_items TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.stories TO authenticated;
GRANT SELECT ON public.tips TO authenticated;
GRANT SELECT ON public.bucket_list TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_bucket_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tokens TO service_role;

GRANT SELECT ON public.trips TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_items TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;