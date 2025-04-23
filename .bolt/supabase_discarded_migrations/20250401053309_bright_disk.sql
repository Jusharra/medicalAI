-- Drop all existing auth-related objects
DO $$ 
BEGIN
    -- Drop triggers
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    
    -- Drop functions
    DROP FUNCTION IF EXISTS public.store_role_in_users();
    
    -- Drop tables
    DROP TABLE IF EXISTS users CASCADE;
    DROP TABLE IF EXISTS user_roles CASCADE;
    DROP TABLE IF EXISTS roles CASCADE;
    DROP TABLE IF EXISTS user_preferences CASCADE;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS on auth.users if not already enabled
DO $$ 
BEGIN
  ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN feature_not_supported THEN NULL;
END $$;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can read own auth data" ON auth.users;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create basic auth policy
CREATE POLICY "Enable read access for own user"
  ON auth.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create profiles table for additional user data
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT profiles_email_key UNIQUE (email)
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    'member'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create indexes
CREATE INDEX IF NOT EXISTS profiles_id_idx ON profiles(id);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);