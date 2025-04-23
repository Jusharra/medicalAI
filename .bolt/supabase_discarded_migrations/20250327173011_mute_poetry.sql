-- Drop existing JWT hook function
DROP FUNCTION IF EXISTS auth.jwt_hook();

-- Create improved JWT hook function with better role handling
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
BEGIN
  -- Get current user info
  SELECT id, email INTO _user_id, _user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Get user's role
  SELECT r.name INTO _user_role
  FROM roles r
  JOIN user_roles ur ON ur.role_id = r.id
  WHERE ur.user_id = _user_id
  LIMIT 1;

  -- Set default role if none found
  IF _user_role IS NULL THEN
    _user_role := 'authenticated';
  END IF;

  -- Return JWT claims
  RETURN jsonb_build_object(
    'role', _user_role,
    'email', _user_email,
    'user_id', _user_id,
    'https://hasura.io/jwt/claims', jsonb_build_object(
      'x-hasura-allowed-roles', ARRAY[_user_role, 'authenticated'],
      'x-hasura-default-role', _user_role,
      'x-hasura-user-id', _user_id::text,
      'x-hasura-user-email', _user_email
    )
  );
END;
$$;

-- Ensure the specified user has the member role
DO $$
DECLARE
  target_user_id uuid;
  member_role_id uuid;
BEGIN
  -- Get user ID
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'qreative.ambitions@gmail.com';

  -- Get member role ID
  SELECT id INTO member_role_id
  FROM roles
  WHERE name = 'member';

  -- If both exist, ensure role assignment
  IF target_user_id IS NOT NULL AND member_role_id IS NOT NULL THEN
    -- Insert or update role assignment
    INSERT INTO user_roles (user_id, role_id)
    VALUES (target_user_id, member_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    -- Ensure user profile exists
    INSERT INTO user_profiles (user_id, email)
    VALUES (target_user_id, 'qreative.ambitions@gmail.com')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;