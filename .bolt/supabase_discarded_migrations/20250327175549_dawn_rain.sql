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

  -- Get user's role with better error handling
  BEGIN
    SELECT r.name INTO _user_role
    FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = _user_id
    ORDER BY r.name = 'member' DESC
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but continue with default role
    RAISE WARNING 'Error getting user role: %', SQLERRM;
    _user_role := 'authenticated';
  END;

  -- Set default role if none found
  IF _user_role IS NULL THEN
    _user_role := 'authenticated';
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

-- Create function to ensure user setup is complete
CREATE OR REPLACE FUNCTION ensure_user_setup()
RETURNS trigger AS $$
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
  SELECT NEW.id, NEW.email
  WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = NEW.id
  )
  ON CONFLICT DO NOTHING;

  -- Ensure user has member role
  IF member_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (NEW.id, member_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  -- Ensure user has preferences
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user setup
CREATE TRIGGER trigger_ensure_user_setup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_setup();