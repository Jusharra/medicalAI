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
  _user_email text;
  _user_role text;
BEGIN
  -- Get current user info
  SELECT id, email INTO _user_id, _user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Get user's role with better error handling
  SELECT role_name INTO _user_role
  FROM user_roles
  WHERE user_id = _user_id
  ORDER BY role_name = 'super_admin' DESC
  LIMIT 1;

  -- Set default role if none found
  IF _user_role IS NULL THEN
    _user_role := 'member';
  END IF;

  -- Return JWT claims
  RETURN jsonb_build_object(
    'role', _user_role,
    'email', _user_email,
    'user_id', _user_id,
    'aud', 'authenticated',
    'iss', 'supabase',
    'exp', extract(epoch from (now() + interval '1 hour'))::integer,
    'https://hasura.io/jwt/claims', jsonb_build_object(
      'x-hasura-allowed-roles', ARRAY[_user_role, 'authenticated'],
      'x-hasura-default-role', _user_role,
      'x-hasura-user-id', _user_id::text,
      'x-hasura-user-email', _user_email
    )
  );
END;
$$;

-- Ensure super_admin role exists and is assigned
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get user ID
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'qreative.ambitions@gmail.com';

  IF target_user_id IS NOT NULL THEN
    -- Ensure user has super_admin role
    INSERT INTO user_roles (user_id, role_name)
    VALUES (target_user_id, 'super_admin')
    ON CONFLICT (user_id, role_name) DO NOTHING;

    -- Log success
    RAISE NOTICE 'Successfully assigned super_admin role to user';
  ELSE
    RAISE EXCEPTION 'Target user not found';
  END IF;
END $$;