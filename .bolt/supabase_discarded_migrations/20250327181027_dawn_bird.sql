/*
  # Improve JWT Hook Function
  
  1. Purpose
    - Enhance role handling
    - Add better error handling
    - Include additional claims
    - Optimize performance
    
  2. Changes
    - Update JWT hook function
    - Add role-specific claims
    - Improve error handling
*/

-- Drop existing JWT hook function
DROP FUNCTION IF EXISTS auth.jwt_hook();

-- Create improved JWT hook function
CREATE OR REPLACE FUNCTION auth.jwt_hook()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _user_role text;
  _user_email text;
  _profile_id uuid;
  _is_member boolean;
  _has_active_membership boolean;
BEGIN
  -- Get current user info
  SELECT id, email INTO _user_id, _user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Get user's primary role with better error handling
  BEGIN
    SELECT r.name INTO _user_role
    FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = _user_id
    ORDER BY 
      CASE r.name
        WHEN 'super_admin' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'physician' THEN 3
        WHEN 'member' THEN 4
        ELSE 5
      END
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error getting user role: %', SQLERRM;
    _user_role := 'authenticated';
  END;

  -- Set default role if none found
  IF _user_role IS NULL THEN
    _user_role := 'authenticated';
  END IF;

  -- Check if user has an active membership
  SELECT EXISTS (
    SELECT 1 
    FROM memberships m
    WHERE m.profile_id = _user_id
    AND m.status = 'active'
    AND m.payment_status = 'succeeded'
    AND (m.current_period_end > now() OR m.current_period_end IS NULL)
  ) INTO _has_active_membership;

  -- Return JWT claims with additional metadata
  RETURN jsonb_build_object(
    'role', _user_role,
    'email', _user_email,
    'user_id', _user_id,
    'has_membership', _has_active_membership,
    'aud', 'authenticated',
    'iss', 'supabase',
    'exp', extract(epoch from (now() + interval '1 hour'))::integer,
    'https://hasura.io/jwt/claims', jsonb_build_object(
      'x-hasura-allowed-roles', ARRAY[_user_role, 'authenticated'],
      'x-hasura-default-role', _user_role,
      'x-hasura-user-id', _user_id::text,
      'x-hasura-user-email', _user_email,
      'x-hasura-has-membership', _has_active_membership::text
    )
  );
END;
$$;

-- Verify function exists
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'jwt_hook'
  ), 'Function jwt_hook does not exist';
END $$;