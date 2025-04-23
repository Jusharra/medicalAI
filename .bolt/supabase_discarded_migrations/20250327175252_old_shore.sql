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
  _jwt_secret text;
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
  ORDER BY r.name = 'member' DESC
  LIMIT 1;

  -- Set default role if none found
  IF _user_role IS NULL THEN
    _user_role := 'authenticated';
  END IF;

  -- Get JWT secret from environment
  _jwt_secret := current_setting('app.settings.jwt_secret', true);

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

-- Create function to ensure user setup is complete
CREATE OR REPLACE FUNCTION ensure_user_setup(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  member_role_id uuid;
BEGIN
  -- Get member role ID
  SELECT id INTO member_role_id
  FROM roles
  WHERE name = 'member'
  LIMIT 1;

  -- Ensure user has a profile
  INSERT INTO user_profiles (user_id, email)
  SELECT u.id, u.email
  FROM auth.users u
  WHERE u.id = user_id
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles p WHERE p.user_id = user_id
  )
  ON CONFLICT DO NOTHING;

  -- Ensure user has member role
  IF member_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (user_id, member_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  -- Ensure user has preferences
  INSERT INTO user_preferences (user_id)
  VALUES (user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Create trigger to ensure complete user setup
CREATE OR REPLACE FUNCTION trigger_ensure_user_setup()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM ensure_user_setup(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS ensure_user_setup_trigger ON auth.users;
CREATE TRIGGER ensure_user_setup_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ensure_user_setup();