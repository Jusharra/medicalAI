/*
  # Fix Authentication System
  
  1. Purpose
    - Clean up and consolidate auth-related tables and functions
    - Remove duplicate configurations
    - Ensure proper role assignment and JWT claims
    
  2. Changes
    - Drop existing functions and triggers
    - Create consolidated user setup function
    - Update JWT hook function
    - Fix indexes and constraints
*/

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trigger_ensure_user_setup ON auth.users;
DROP FUNCTION IF EXISTS public.store_role_in_users();
DROP FUNCTION IF EXISTS public.ensure_user_setup();
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS auth.jwt_hook();

-- Create consolidated user setup function
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
  -- Log error but don't fail the transaction
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

-- Drop duplicate indexes
DROP INDEX IF EXISTS idx_user_roles_role_lookup;
DROP INDEX IF EXISTS idx_user_profiles_lookup;
DROP INDEX IF EXISTS idx_roles_name_lookup;

-- Create optimized indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_unique ON user_roles (user_id, role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_lookup ON user_roles (user_id, role_id);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles (name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles (user_id);

-- Fix any existing users without proper setup
DO $$
DECLARE
  member_role_id uuid;
BEGIN
  -- Get member role ID
  SELECT id INTO member_role_id
  FROM roles
  WHERE name = 'member'
  LIMIT 1;

  -- Add missing profiles
  INSERT INTO user_profiles (user_id, email)
  SELECT id, email
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles p WHERE p.user_id = u.id
  )
  ON CONFLICT DO NOTHING;

  -- Add missing role assignments
  INSERT INTO user_roles (user_id, role_id)
  SELECT u.id, member_role_id
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = u.id
    AND ur.role_id = member_role_id
  )
  ON CONFLICT DO NOTHING;

  -- Add missing preferences
  INSERT INTO user_preferences (user_id)
  SELECT id
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM user_preferences up WHERE up.user_id = u.id
  )
  ON CONFLICT DO NOTHING;
END $$;

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

  -- Verify indexes exist
  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_roles_unique'
  ), 'Index idx_user_roles_unique does not exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_roles_lookup'
  ), 'Index idx_user_roles_lookup does not exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_roles_name'
  ), 'Index idx_roles_name does not exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_profiles_user'
  ), 'Index idx_user_profiles_user does not exist';
END $$;