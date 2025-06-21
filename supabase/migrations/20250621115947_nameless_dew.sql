/*
  # Fix trigger function security privileges

  1. Problem
    - The prevent_self_invitation() trigger function accesses auth.users but lacks SECURITY DEFINER
    - This causes "permission denied for table users" when the trigger executes
    - Trigger functions run with the privileges of the user who triggered them, not the function owner

  2. Solution
    - Add SECURITY DEFINER to the prevent_self_invitation() function
    - This allows the function to access auth.users with elevated privileges
    - Maintain the same logic but with proper security context

  3. Security
    - SECURITY DEFINER is safe here because the function only reads from auth.users
    - The function validates business logic (preventing self-invitations)
    - No sensitive data is exposed beyond what's needed for validation
*/

-- Drop and recreate the prevent_self_invitation function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION prevent_self_invitation()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER  -- This is the key addition
AS $$
DECLARE
  v_inviter_email text;
BEGIN
  -- Get the inviter's email (now with elevated privileges)
  SELECT email INTO v_inviter_email
  FROM auth.users
  WHERE id = NEW.inviter_id;
  
  -- Check if trying to invite themselves
  IF LOWER(NEW.invitee_email) = LOWER(v_inviter_email) THEN
    RAISE EXCEPTION 'Cannot invite yourself to a trip';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Ensure the trigger is properly configured
DROP TRIGGER IF EXISTS trigger_prevent_self_invitation ON public.trip_invitations;
CREATE TRIGGER trigger_prevent_self_invitation
  BEFORE INSERT OR UPDATE ON public.trip_invitations
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_invitation();

-- Grant necessary permissions for the function to work properly
GRANT EXECUTE ON FUNCTION prevent_self_invitation() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION prevent_self_invitation() IS
  'Trigger function to prevent users from inviting themselves to trips. Uses SECURITY DEFINER to access auth.users table.';