/*
  # Fix ambiguous role column reference in RPC functions

  1. Updates
    - Fix `get_trip_participants_with_users` function to properly qualify column references
    - Fix `get_trip_with_participants` function to properly qualify column references
    - Ensure all column references are unambiguous by using table aliases

  2. Security
    - Maintains existing RLS policies
    - No changes to permissions
*/

-- Drop and recreate get_trip_participants_with_users function with proper column qualification
DROP FUNCTION IF EXISTS get_trip_participants_with_users(uuid);

CREATE OR REPLACE FUNCTION get_trip_participants_with_users(p_trip_id uuid)
RETURNS TABLE (
  user_id uuid,
  role text,
  joined_at timestamptz,
  user_display_name text,
  user_email text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.user_id,
    tp.role,  -- Explicitly reference trip_participants.role
    tp.joined_at,
    u.display_name as user_display_name,
    u.email as user_email
  FROM trip_participants tp
  JOIN users u ON tp.user_id = u.id
  WHERE tp.trip_id = p_trip_id
  ORDER BY tp.joined_at ASC;
END;
$$;

-- Drop and recreate get_trip_with_participants function with proper column qualification
DROP FUNCTION IF EXISTS get_trip_with_participants(uuid);

CREATE OR REPLACE FUNCTION get_trip_with_participants(p_trip_id uuid)
RETURNS TABLE (
  trip_id uuid,
  destination text,
  start_date date,
  end_date date,
  max_participants integer,
  user_id uuid,
  participant_ids uuid[],
  owner_email text,
  owner_display_name text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as trip_id,
    t.destination,
    t.start_date,
    t.end_date,
    t.max_participants,
    t.user_id,
    t.participant_ids,
    u.email as owner_email,
    u.display_name as owner_display_name
  FROM trips t
  LEFT JOIN users u ON t.user_id = u.id
  WHERE t.id = p_trip_id;
END;
$$;

-- Also fix get_pending_invitations_for_user if it has similar issues
DROP FUNCTION IF EXISTS get_pending_invitations_for_user();

CREATE OR REPLACE FUNCTION get_pending_invitations_for_user()
RETURNS TABLE (
  invitation_id uuid,
  trip_id uuid,
  inviter_id uuid,
  invitee_email text,
  token text,
  status text,
  created_at timestamptz,
  responded_at timestamptz,
  trip_destination text,
  trip_start_date date,
  trip_end_date date,
  trip_max_participants integer,
  inviter_display_name text,
  inviter_email text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ti.id as invitation_id,
    ti.trip_id,
    ti.inviter_id,
    ti.invitee_email,
    ti.token,
    ti.status,
    ti.created_at,
    ti.responded_at,
    t.destination as trip_destination,
    t.start_date as trip_start_date,
    t.end_date as trip_end_date,
    t.max_participants as trip_max_participants,
    u.display_name as inviter_display_name,
    u.email as inviter_email
  FROM trip_invitations ti
  JOIN trips t ON ti.trip_id = t.id
  JOIN users u ON ti.inviter_id = u.id
  WHERE ti.invitee_email = (jwt() ->> 'email'::text)
    AND ti.status = 'pending'
  ORDER BY ti.created_at DESC;
END;
$$;