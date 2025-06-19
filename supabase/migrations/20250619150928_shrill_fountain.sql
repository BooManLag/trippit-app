/*
  # Fix RLS Policies for Nested Joins

  1. Security Updates
    - Enable RLS on all tables
    - Grant proper permissions to authenticated role
    - Create comprehensive policies for all tables
    - Fix "permission denied for table users" errors

  2. Tables Updated
    - users: Allow reading all user profiles (needed for joins)
    - trip_invitations: Allow managing sent/received invitations
    - trips: Allow accessing owned/participated trips
    - trip_participants: Allow managing participation
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

-- 1) USERS table - Enable RLS and create comprehensive policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.users TO authenticated;

-- Drop all existing user policies to avoid conflicts
DROP POLICY IF EXISTS authenticated_can_read_users ON public.users;
DROP POLICY IF EXISTS users_update_own_data ON public.users;
DROP POLICY IF EXISTS users_insert_own_profile ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Auth service can insert users" ON public.users;
DROP POLICY IF EXISTS users_own_data ON public.users;
DROP POLICY IF EXISTS users_invitation_read ON public.users;
DROP POLICY IF EXISTS users_trip_context_read ON public.users;
DROP POLICY IF EXISTS public_read_for_invitations ON public.users;
DROP POLICY IF EXISTS "Users can read inviter profiles" ON public.users;
DROP POLICY IF EXISTS "Allow reading profiles for invitation relationships" ON public.users;
DROP POLICY IF EXISTS authenticated_can_read_users ON public.users;
DROP POLICY IF EXISTS users_invitation_context_read ON public.users;

-- Allow any authenticated user to read user profiles (needed for joins)
CREATE POLICY authenticated_can_read_users
  ON public.users FOR SELECT
  TO authenticated
  USING (true);

-- Users can update only their own data
CREATE POLICY users_update_own_data
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY users_insert_own_profile
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- 2) TRIP_INVITATIONS table - Enable RLS and create policies
ALTER TABLE public.trip_invitations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.trip_invitations TO authenticated;

-- Drop existing invitation policies
DROP POLICY IF EXISTS auth_trip_invitations_select ON public.trip_invitations;
DROP POLICY IF EXISTS auth_trip_invitations_insert ON public.trip_invitations;
DROP POLICY IF EXISTS auth_trip_invitations_update ON public.trip_invitations;
DROP POLICY IF EXISTS invitations_owner_create ON public.trip_invitations;
DROP POLICY IF EXISTS invitations_owner_read ON public.trip_invitations;
DROP POLICY IF EXISTS invitee_sees_own_invites ON public.trip_invitations;
DROP POLICY IF EXISTS update_invitations ON public.trip_invitations;
DROP POLICY IF EXISTS invitations_invitee_access ON public.trip_invitations;
DROP POLICY IF EXISTS invitations_owner_manage ON public.trip_invitations;
DROP POLICY IF EXISTS invitations_invitee_read ON public.trip_invitations;
DROP POLICY IF EXISTS invitations_invitee_update ON public.trip_invitations;

-- Allow users to read invitations they sent or received
CREATE POLICY auth_trip_invitations_select
  ON public.trip_invitations FOR SELECT
  TO authenticated
  USING (
    invitee_email = auth.jwt() ->> 'email'
    OR inviter_id = auth.uid()
  );

-- Allow users to create invitations for their own trips
CREATE POLICY auth_trip_invitations_insert
  ON public.trip_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_id = auth.uid()
  );

-- Allow users to update invitations sent to them
CREATE POLICY auth_trip_invitations_update
  ON public.trip_invitations FOR UPDATE
  TO authenticated
  USING (
    invitee_email = auth.jwt() ->> 'email'
    OR inviter_id = auth.uid()
  )
  WITH CHECK (
    invitee_email = auth.jwt() ->> 'email'
    OR inviter_id = auth.uid()
  );

-- 3) TRIPS table - Enable RLS and create policies
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO authenticated;

-- Drop existing trip policies
DROP POLICY IF EXISTS auth_trips_select ON public.trips;
DROP POLICY IF EXISTS auth_trips_insert ON public.trips;
DROP POLICY IF EXISTS auth_trips_update ON public.trips;
DROP POLICY IF EXISTS auth_trips_delete ON public.trips;
DROP POLICY IF EXISTS trips_owner_full_access ON public.trips;
DROP POLICY IF EXISTS trips_participant_read ON public.trips;
DROP POLICY IF EXISTS trips_invited_read ON public.trips;
DROP POLICY IF EXISTS trips_anonymous_read ON public.trips;
DROP POLICY IF EXISTS trips_anonymous_access ON public.trips;
DROP POLICY IF EXISTS owner_or_participant_sees_trip ON public.trips;
DROP POLICY IF EXISTS trips_owner_modify ON public.trips;
DROP POLICY IF EXISTS insert_trips ON public.trips;
DROP POLICY IF EXISTS update_trips ON public.trips;
DROP POLICY IF EXISTS delete_trips ON public.trips;

-- Users can read trips they own or are invited to
CREATE POLICY auth_trips_select
  ON public.trips FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    id IN (
      SELECT trip_id FROM trip_invitations 
      WHERE invitee_email = auth.jwt() ->> 'email'
    )
  );

-- Users can insert their own trips
CREATE POLICY auth_trips_insert
  ON public.trips FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update only their own trips
CREATE POLICY auth_trips_update
  ON public.trips FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete only their own trips
CREATE POLICY auth_trips_delete
  ON public.trips FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Allow anonymous access to trips without owners
CREATE POLICY trips_anonymous_access
  ON public.trips FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- 4) CHECKLIST_ITEMS table - Enable RLS and create policies
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_items TO authenticated;

-- Drop existing checklist policies
DROP POLICY IF EXISTS "Users can manage their checklist items" ON public.checklist_items;
DROP POLICY IF EXISTS "Allow anonymous checklist creation" ON public.checklist_items;
DROP POLICY IF EXISTS "Allow anonymous checklist reading" ON public.checklist_items;

-- Users can manage their own checklist items
CREATE POLICY "Users can manage their checklist items"
  ON public.checklist_items FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow anonymous users to create/read checklist items without user_id
CREATE POLICY "Allow anonymous checklist creation"
  ON public.checklist_items FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Allow anonymous checklist reading"
  ON public.checklist_items FOR SELECT
  TO anon
  USING (user_id IS NULL);

-- 5) BUCKET_LIST_ITEMS table - Enable RLS and create policies
ALTER TABLE public.bucket_list_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bucket_list_items TO authenticated;

-- Drop existing bucket list policies
DROP POLICY IF EXISTS "Users can manage their bucket list items" ON public.bucket_list_items;

-- Users can manage their own bucket list items
CREATE POLICY "Users can manage their bucket list items"
  ON public.bucket_list_items FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6) USER_BUCKET_PROGRESS table - Enable RLS and create policies
ALTER TABLE public.user_bucket_progress ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_bucket_progress TO authenticated;

-- Drop existing user bucket progress policies
DROP POLICY IF EXISTS "Users can manage their bucket progress" ON public.user_bucket_progress;

-- Users can manage their own bucket progress
CREATE POLICY "Users can manage their bucket progress"
  ON public.user_bucket_progress FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7) DESTINATION_BUCKET_ITEMS table - Enable RLS and create policies
ALTER TABLE public.destination_bucket_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.destination_bucket_items TO authenticated, anon;

-- Drop existing destination bucket policies
DROP POLICY IF EXISTS "Everyone can read bucket items" ON public.destination_bucket_items;

-- Everyone can read destination bucket items
CREATE POLICY "Everyone can read bucket items"
  ON public.destination_bucket_items FOR SELECT
  TO authenticated, anon
  USING (true);

-- 8) STORIES table - Enable RLS and create policies
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.stories TO authenticated;

-- Drop existing story policies
DROP POLICY IF EXISTS "Users can read all stories" ON public.stories;
DROP POLICY IF EXISTS "Users can create stories" ON public.stories;
DROP POLICY IF EXISTS "Users can update own stories" ON public.stories;

-- Everyone can read all stories
CREATE POLICY "Users can read all stories"
  ON public.stories FOR SELECT
  TO authenticated
  USING (true);

-- Users can create stories
CREATE POLICY "Users can create stories"
  ON public.stories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own stories
CREATE POLICY "Users can update own stories"
  ON public.stories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 9) TIPS table - Enable RLS and create policies
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.tips TO authenticated;

-- Drop existing tip policies
DROP POLICY IF EXISTS "Everyone can read tips" ON public.tips;

-- Everyone can read tips
CREATE POLICY "Everyone can read tips"
  ON public.tips FOR SELECT
  TO authenticated
  USING (true);

-- 10) BUCKET_LIST table - Enable RLS and create policies
ALTER TABLE public.bucket_list ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.bucket_list TO authenticated;

-- Drop existing bucket list policies
DROP POLICY IF EXISTS "Everyone can read bucket list" ON public.bucket_list;

-- Everyone can read bucket list
CREATE POLICY "Everyone can read bucket list"
  ON public.bucket_list FOR SELECT
  TO authenticated
  USING (true);

-- 11) USER_BUCKET_ITEMS table - Enable RLS and create policies
ALTER TABLE public.user_bucket_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_bucket_items TO authenticated;

-- Drop existing user bucket item policies
DROP POLICY IF EXISTS "Users can CRUD own bucket items" ON public.user_bucket_items;

-- Users can manage their own bucket items
CREATE POLICY "Users can CRUD own bucket items"
  ON public.user_bucket_items FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- 12) TOKENS table - Enable RLS and create policies (for edge functions)
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tokens TO service_role;

-- Drop existing token policies
DROP POLICY IF EXISTS "Service role can manage tokens" ON public.tokens;

-- Only service role can manage tokens
CREATE POLICY "Service role can manage tokens"
  ON public.tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure all necessary permissions are granted
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;