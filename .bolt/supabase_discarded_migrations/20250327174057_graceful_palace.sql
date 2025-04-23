-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.store_role_in_users();

-- Create improved function for user creation with better error handling
CREATE OR REPLACE FUNCTION public.store_role_in_users()
RETURNS TRIGGER AS $$
DECLARE
  member_role_id uuid;
  profile_exists boolean;
BEGIN
  -- Get the member role ID
  SELECT id INTO member_role_id
  FROM roles
  WHERE name = 'member'
  LIMIT 1;

  -- Check if profile already exists
  SELECT EXISTS (
    SELECT 1 FROM user_profiles WHERE user_id = NEW.id
  ) INTO profile_exists;

  -- Create user profile if it doesn't exist
  IF NOT profile_exists THEN
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
    );
  END IF;

  -- Assign member role if it exists and hasn't been assigned
  IF member_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (NEW.id, member_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  -- Initialize user preferences
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.store_role_in_users();

-- Verify function exists
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'store_role_in_users'
  ), 'Function store_role_in_users does not exist';
END $$;

-- Verify trigger exists
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ), 'Trigger on_auth_user_created does not exist';
END $$;

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
  );

  -- Add missing role assignments
  INSERT INTO user_roles (user_id, role_id)
  SELECT u.id, member_role_id
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = u.id
    AND ur.role_id = member_role_id
  );

  -- Add missing preferences
  INSERT INTO user_preferences (user_id)
  SELECT id
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM user_preferences up WHERE up.user_id = u.id
  );
END $$;