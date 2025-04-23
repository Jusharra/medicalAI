-- Drop existing trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Update existing profiles
UPDATE profiles
SET user_id = id
WHERE user_id IS NULL;

-- Make user_id NOT NULL after updating existing records
ALTER TABLE profiles
  ALTER COLUMN user_id SET NOT NULL;

-- Add unique constraint
ALTER TABLE profiles
  ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);

-- Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  member_role_id uuid;
BEGIN
  -- Create profile
  INSERT INTO profiles (
    id,
    user_id,
    email,
    is_admin
  ) VALUES (
    NEW.id,
    NEW.id,
    NEW.email,
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    email = EXCLUDED.email;

  -- Get member role ID
  SELECT id INTO member_role_id
  FROM role_permissions
  WHERE name = 'member';

  -- Assign member role
  IF member_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_name)
    VALUES (NEW.id, 'member')
    ON CONFLICT (user_id, role_name) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Verify setup
DO $$
BEGIN
  -- Verify columns exist
  ASSERT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'user_id'
  ), 'user_id column does not exist';

  ASSERT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'is_admin'
  ), 'is_admin column does not exist';

  -- Verify constraints
  ASSERT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'profiles'
    AND constraint_name = 'profiles_user_id_key'
  ), 'user_id unique constraint does not exist';

  -- Verify trigger exists
  ASSERT EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ), 'Trigger on_auth_user_created does not exist';
END $$;