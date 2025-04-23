-- Create user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT true,
  marketing_emails boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_preferences_user_id_key UNIQUE (user_id)
);

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  avatar_url text,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT profiles_email_key UNIQUE (email)
);

-- Enable RLS if not already enabled
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "preferences_read_own" ON user_preferences;
    DROP POLICY IF EXISTS "preferences_insert_own" ON user_preferences;
    DROP POLICY IF EXISTS "preferences_update_own" ON user_preferences;
    DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
    DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
    DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create policies for user_preferences
CREATE POLICY "preferences_read_own"
  ON user_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "preferences_insert_own"
  ON user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "preferences_update_own"
  ON user_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for profiles
CREATE POLICY "profiles_read_own"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _profile_exists boolean;
  _preferences_exist boolean;
BEGIN
  -- Check if profile exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = NEW.id
  ) INTO _profile_exists;

  -- Check if preferences exist
  SELECT EXISTS (
    SELECT 1 FROM user_preferences WHERE user_id = NEW.id
  ) INTO _preferences_exist;

  -- Create profile if it doesn't exist
  IF NOT _profile_exists THEN
    INSERT INTO profiles (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Create preferences if they don't exist
  IF NOT _preferences_exist THEN
    INSERT INTO user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Add missing profiles for existing users
INSERT INTO profiles (id, email)
SELECT id, email
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.users.id
)
ON CONFLICT (id) DO NOTHING;

-- Add missing preferences for existing users
INSERT INTO user_preferences (user_id)
SELECT id
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM user_preferences WHERE user_preferences.user_id = auth.users.id
)
ON CONFLICT (user_id) DO NOTHING;