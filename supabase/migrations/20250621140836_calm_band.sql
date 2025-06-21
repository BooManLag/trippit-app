/*
  # Fix trip owner display in dashboard

  1. Problem
    - Trip participants function doesn't include the trip owner properly
    - Dashboard shows "Unknown" for trip owner when user joins via invitation
    - Need to ensure trip owner is always included in participants list

  2. Solution
    - Update get_trip_participants_with_users to always include trip owner
    - Ensure proper role assignment (owner vs participant)
    - Fix data consistency issues

  3. Changes
    - Enhanced RPC function to include trip owner data
    - Better handling of owner vs participant roles
    - Improved data consistency
*/

-- Drop and recreate the function to get trip participants with proper owner handling
CREATE OR REPLACE FUNCTION get_trip_participants_with_users(p_trip_id uuid)
RETURNS TABLE(
  participant_id uuid,
  user_id uuid,
  role text,
  joined_at timestamptz,
  user_email text,
  user_display_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return all participants including the trip owner
  -- The trip owner should always be included even if not in trip_participants table
  RETURN QUERY
  WITH trip_owner AS (
    -- Get the trip owner info
    SELECT 
      t.user_id,
      'owner'::text as role,
      t.created_at as joined_at,
      u.email,
      u.display_name
    FROM trips t
    JOIN users u ON u.id = t.user_id
    WHERE t.id = p_trip_id AND t.user_id IS NOT NULL
  ),
  other_participants AS (
    -- Get other participants (non-owners)
    SELECT 
      tp.id as participant_id,
      tp.user_id,
      tp.role,
      tp.joined_at,
      u.email as user_email,
      u.display_name as user_display_name
    FROM trip_participants tp
    JOIN users u ON u.id = tp.user_id
    JOIN trips t ON t.id = tp.trip_id
    WHERE tp.trip_id = p_trip_id 
      AND tp.user_id != t.user_id  -- Exclude owner from this query
  )
  -- Combine owner and participants
  SELECT 
    NULL::uuid as participant_id,  -- Owner doesn't have a participant_id
    to_.user_id,
    to_.role,
    to_.joined_at,
    to_.email as user_email,
    to_.display_name as user_display_name
  FROM trip_owner to_
  
  UNION ALL
  
  SELECT 
    op.participant_id,
    op.user_id,
    op.role,
    op.joined_at,
    op.user_email,
    op.user_display_name
  FROM other_participants op
  
  ORDER BY 
    CASE WHEN role = 'owner' THEN 0 ELSE 1 END,  -- Owner first
    joined_at ASC;
END;
$$;

-- Also update the get_trip_with_participants function to ensure owner data is included
CREATE OR REPLACE FUNCTION get_trip_with_participants(p_trip_id uuid)
RETURNS TABLE(
  trip_id uuid,
  destination text,
  start_date date,
  end_date date,
  max_participants integer,
  user_id uuid,
  participant_ids uuid[],
  created_at timestamptz,
  owner_email text,
  owner_display_name text,
  participant_count integer
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
    t.created_at,
    u.email as owner_email,
    COALESCE(u.display_name, u.email) as owner_display_name,  -- Fallback to email if no display name
    array_length(t.participant_ids, 1) as participant_count
  FROM trips t
  LEFT JOIN users u ON u.id = t.user_id
  WHERE t.id = p_trip_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_trip_participants_with_users(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trip_with_participants(uuid) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_trip_participants_with_users(uuid) IS
  'Returns trip participants with their user details, ensuring trip owner is always included with proper role assignment';

COMMENT ON FUNCTION get_trip_with_participants(uuid) IS
  'Returns trip details with owner info and participant count, with fallback for display names';