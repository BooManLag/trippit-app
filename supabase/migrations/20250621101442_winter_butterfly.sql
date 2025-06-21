/*
  # Fix RLS infinite recursion

  This migration fixes the infinite recursion issue in RLS policies by:
  1. Dropping problematic circular policies on trips and trip_participants
  2. Creating simple, non-recursive policies
  3. Ensuring trip_participants policy only checks user_id = auth.uid()
  4. Creating a single trips policy that uses EXISTS subquery without circular references
  5. Fixing trip_invitations policy to use proper email check

  ## Changes Made
  1. **Dropped Policies**: Removed circular policies causing recursion
  2. **New trip_participants Policy**: Simple user_id check only
  3. **New trips Policy**: Owner or participant access via EXISTS subquery
  4. **Fixed trip_invitations Policy**: Proper email-based access control
*/

-- 1) DROP the old, circular policies that cause recursion

-- Drop problematic trips policies
DROP POLICY IF EXISTS "select trips" ON public.trips;
DROP POLICY IF EXISTS "trips_access_policy" ON public.trips;
DROP POLICY IF EXISTS "trips_anonymous_access" ON public.trips;
DROP POLICY IF EXISTS "trips_anonymous_read" ON public.trips;

-- Drop problematic trip_participants policies
DROP POLICY IF EXISTS "select participants" ON public.trip_participants;
DROP POLICY IF EXISTS "participants_read_policy" ON public.trip_participants;

-- Drop problematic trip_invitations policies
DROP POLICY IF EXISTS "select invitations" ON public.trip_invitations;
DROP POLICY IF EXISTS "invitations_invitee_access" ON public.trip_invitations;
DROP POLICY IF EXISTS "users_invitation_context_read" ON public.users;

-- 2) Create simple, non-recursive policies

-- trip_participants: Allow participants to see their own rows (no joins here)
CREATE POLICY "participants_see_own_entries"
  ON public.trip_participants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- trips: Owner or invited can see a trip (using EXISTS subquery)
CREATE POLICY "owner_or_participant_sees_trip"
  ON public.trips
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()  -- owners
    OR EXISTS (
      SELECT 1
      FROM public.trip_participants p
      WHERE p.trip_id = public.trips.id
        AND p.user_id = auth.uid()
    )
  );

-- trip_invitations: Invitee can see their own invites
CREATE POLICY "invitee_sees_own_invites"
  ON public.trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    invitee_email = (auth.jwt() ->> 'email')::text
  );

-- trip_invitations: Trip owner can see invites for their trips
CREATE POLICY "trip_owner_sees_invites"
  ON public.trip_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.trips t
      WHERE t.id = trip_invitations.trip_id
        AND t.user_id = auth.uid()
    )
  );

-- users: Allow reading user data for invitation context (simplified)
CREATE POLICY "users_invitation_read"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR id IN (
      SELECT inviter_id
      FROM public.trip_invitations
      WHERE invitee_email = (auth.jwt() ->> 'email')::text
    )
    OR id IN (
      SELECT user_id
      FROM public.trip_participants
      WHERE trip_id IN (
        SELECT trip_id
        FROM public.trip_participants
        WHERE user_id = auth.uid()
      )
    )
  );
