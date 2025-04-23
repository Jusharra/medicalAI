-- Drop existing functions and triggers
DO $$ 
BEGIN
    -- Drop triggers first
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP TRIGGER IF EXISTS trigger_ensure_user_setup ON auth.users;
    DROP TRIGGER IF EXISTS ensure_user_setup_trigger ON auth.users;
    
    -- Drop functions
    DROP FUNCTION IF EXISTS public.store_role_in_users() CASCADE;
    DROP FUNCTION IF EXISTS public.ensure_user_setup() CASCADE;
    DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
    DROP FUNCTION IF EXISTS auth.jwt_hook() CASCADE;
    DROP FUNCTION IF EXISTS public.trigger_ensure_user_setup() CASCADE;
    DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
    
    -- Drop any remaining related functions
    DROP FUNCTION IF EXISTS public.return_all_teams_where_user_has_access(uuid) CASCADE;
    DROP FUNCTION IF EXISTS public.analyze_health_trends(uuid) CASCADE;
    
    RAISE NOTICE 'Successfully dropped all functions and triggers';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping functions: %', SQLERRM;
END $$;

-- Create new consolidated user setup function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  member_role_id uuid;
BEGIN
  -- Get the member role ID
  SELECT id INTO member_role_id
  FROM roles
  WHERE name = 'member'
  LIMIT 1;

  -- Create user profile
  INSERT INTO user_profiles (
    user_id,
    email,
    first_name,
    last_name
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Assign member role
  IF member_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (NEW.id, member_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  -- Initialize preferences
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new user trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

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
  _has_active_membership boolean;
BEGIN
  -- Get current user info
  SELECT id, email INTO _user_id, _user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Get user's primary role
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

  -- Set default role if none found
  IF _user_role IS NULL THEN
    _user_role := 'authenticated';
  END IF;

  -- Check active membership
  SELECT EXISTS (
    SELECT 1 
    FROM memberships m
    WHERE m.profile_id = _user_id
    AND m.status = 'active'
    AND m.payment_status = 'succeeded'
    AND (m.current_period_end > now() OR m.current_period_end IS NULL)
  ) INTO _has_active_membership;

  -- Return JWT claims
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

-- Verify setup
DO $$
BEGIN
  -- Verify functions exist
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user'
  ), 'Function handle_new_user does not exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'jwt_hook'
  ), 'Function jwt_hook does not exist';

  -- Verify trigger exists
  ASSERT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ), 'Trigger on_auth_user_created does not exist';
END $$;