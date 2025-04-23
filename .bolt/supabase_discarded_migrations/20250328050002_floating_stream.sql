-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create improved user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _profile_exists boolean;
  _role_exists boolean;
  _preferences_exist boolean;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.id
  ) INTO _profile_exists;

  -- Create profile if it doesn't exist
  IF NOT _profile_exists THEN
    BEGIN
      INSERT INTO profiles (
        id,
        first_name,
        last_name,
        phone,
        email,
        is_admin,
        is_super_admin,
        updated_at
      ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
        NEW.email,
        false,
        false,
        now()
      );
    EXCEPTION WHEN unique_violation THEN
      -- Profile already exists, ignore
      NULL;
    END;
  END IF;

  -- Check if user already has a role
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = NEW.id
  ) INTO _role_exists;

  -- Assign member role if no role exists
  IF NOT _role_exists THEN
    BEGIN
      INSERT INTO user_roles (user_id, role_name)
      VALUES (NEW.id, 'member')
      ON CONFLICT (user_id, role_name) DO NOTHING;
    EXCEPTION WHEN unique_violation THEN
      -- Role already assigned, ignore
      NULL;
    END;
  END IF;

  -- Check if preferences exist
  SELECT EXISTS (
    SELECT 1 FROM user_preferences WHERE user_id = NEW.id
  ) INTO _preferences_exist;

  -- Initialize preferences if they don't exist
  IF NOT _preferences_exist THEN
    BEGIN
      INSERT INTO user_preferences (user_id)
      VALUES (NEW.id)
      ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN unique_violation THEN
      -- Preferences already exist, ignore
      NULL;
    END;
  END IF;

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

-- Fix any existing users without proper setup
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT id, email, raw_user_meta_data 
    FROM auth.users 
  LOOP
    -- Add missing profiles
    INSERT INTO profiles (
      id,
      first_name,
      last_name,
      email,
      is_admin,
      is_super_admin,
      updated_at
    ) VALUES (
      user_record.id,
      COALESCE(user_record.raw_user_meta_data->>'first_name', split_part(user_record.email, '@', 1)),
      COALESCE(user_record.raw_user_meta_data->>'last_name', ''),
      user_record.email,
      false,
      false,
      now()
    )
    ON CONFLICT (id) DO NOTHING;

    -- Add missing role assignments
    INSERT INTO user_roles (user_id, role_name)
    VALUES (user_record.id, 'member')
    ON CONFLICT (user_id, role_name) DO NOTHING;

    -- Add missing preferences
    INSERT INTO user_preferences (user_id)
    VALUES (user_record.id)
    ON CONFLICT (user_id) DO NOTHING;
  END LOOP;
END $$;

-- Verify setup
DO $$
BEGIN
  -- Verify function exists
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user'
  ), 'Function handle_new_user does not exist';

  -- Verify trigger exists
  ASSERT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ), 'Trigger on_auth_user_created does not exist';

  -- Verify RLS policies
  ASSERT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname IN ('profiles_read_own', 'profiles_update_own', 'profiles_insert_own')
  ), 'Not all required policies exist';
END $$;