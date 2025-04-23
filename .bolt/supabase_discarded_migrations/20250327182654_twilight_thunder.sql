/*
  # Update Profiles Schema
  
  1. Changes
    - Add username and website fields
    - Add username length constraint
    - Update user creation trigger
    
  2. Security
    - Maintain existing RLS policies
    - Keep existing indexes
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Modify profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS website text,
  ADD CONSTRAINT username_length CHECK (char_length(username) >= 3);

-- Create improved user creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  member_role_id uuid;
  default_username text;
BEGIN
  -- Get the member role ID
  SELECT id INTO member_role_id
  FROM roles
  WHERE name = 'member'
  LIMIT 1;

  -- Generate default username from email
  default_username := split_part(NEW.email, '@', 1);
  
  -- Ensure username is at least 3 characters
  IF length(default_username) < 3 THEN
    default_username := default_username || repeat('0', 3 - length(default_username));
  END IF;

  -- Create user profile
  INSERT INTO profiles (
    id,
    username,
    full_name,
    avatar_url,
    website,
    updated_at
  ) VALUES (
    NEW.id,
    default_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NULL,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();

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

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create index for username lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- Verify setup
DO $$
BEGIN
  -- Verify columns exist
  ASSERT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'username'
  ), 'Username column does not exist';

  ASSERT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'website'
  ), 'Website column does not exist';

  -- Verify constraint exists
  ASSERT EXISTS (
    SELECT 1
    FROM information_schema.check_constraints
    WHERE constraint_name = 'username_length'
  ), 'Username length constraint does not exist';

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