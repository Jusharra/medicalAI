-- Drop user_profiles table if it exists
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Add necessary columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email text;

-- Update existing profiles with email from auth.users
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id;

-- Make email NOT NULL after updating existing records
ALTER TABLE profiles
  ALTER COLUMN email SET NOT NULL;

-- Add unique constraint for email
ALTER TABLE profiles
  ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create improved user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile if it doesn't exist
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
  )
  ON CONFLICT (id) DO NOTHING;

  -- Assign member role if no role exists
  INSERT INTO user_roles (user_id, role_name)
  VALUES (NEW.id, 'member')
  ON CONFLICT (user_id, role_name) DO NOTHING;

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

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Fix any existing users without proper setup
DO $$
BEGIN
  -- Add missing profiles
  INSERT INTO profiles (id, email)
  SELECT id, email
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

-- Verify setup
DO $$
BEGIN
  -- Verify columns exist
  ASSERT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name IN ('first_name', 'last_name', 'phone', 'avatar_url', 'is_admin', 'is_super_admin', 'email')
  ), 'Missing required columns in profiles table';

  -- Verify unique constraint exists
  ASSERT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_email_key'
    AND contype = 'u'
    AND conrelid = 'public.profiles'::regclass
  ), 'Unique constraint on profiles(email) does not exist';

  -- Verify indexes exist
  ASSERT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'profiles'
    AND indexname IN ('idx_profiles_id', 'idx_profiles_email')
  ), 'Missing required indexes on profiles table';

  -- Verify function exists
  ASSERT EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'handle_new_user'
  ), 'Function handle_new_user does not exist';

  -- Verify trigger exists
  ASSERT EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ), 'Trigger on_auth_user_created does not exist';
END $$;