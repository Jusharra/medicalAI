-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create simplified user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create basic profile
  INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Assign member role
  INSERT INTO user_roles (user_id, role_name)
  VALUES (NEW.id, 'member')
  ON CONFLICT (user_id, role_name) DO NOTHING;

  -- Initialize preferences
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
  EXECUTE FUNCTION public.handle_new_user();

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
END $$;