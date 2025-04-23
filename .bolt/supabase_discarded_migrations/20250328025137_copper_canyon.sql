-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create improved user creation function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _profile_exists boolean;
  _role_exists boolean;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.id
  ) INTO _profile_exists;

  -- Create profile if it doesn't exist
  IF NOT _profile_exists THEN
    INSERT INTO profiles (
      id,
      user_id,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.id,
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Check if user already has a role
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = NEW.id
  ) INTO _role_exists;

  -- Assign member role if no role exists
  IF NOT _role_exists THEN
    INSERT INTO user_roles (user_id, role_name)
    VALUES (NEW.id, 'member')
    ON CONFLICT (user_id, role_name) DO NOTHING;
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

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify function and trigger exist
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user'
  ), 'Function handle_new_user does not exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ), 'Trigger on_auth_user_created does not exist';
END $$;

-- Fix any existing users without proper setup
DO $$
BEGIN
  -- Add missing profiles
  INSERT INTO profiles (id, user_id)
  SELECT id, id
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = u.id
  )
  ON CONFLICT (id) DO NOTHING;

  -- Add missing role assignments
  INSERT INTO user_roles (user_id, role_name)
  SELECT u.id, 'member'
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
  )
  ON CONFLICT (user_id, role_name) DO NOTHING;

  -- Add missing preferences
  INSERT INTO user_preferences (user_id)
  SELECT id
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM user_preferences up WHERE up.user_id = u.id
  )
  ON CONFLICT (user_id) DO NOTHING;
END $$;