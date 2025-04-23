/*
  # Fix Profile and Account Settings Access

  1. Changes
    - Update RLS policies for profiles table
    - Allow all authenticated users to access their own profile
    - Remove role-based restrictions for profile access

  2. Security
    - Maintain data isolation between users
    - Allow users to only access their own data
    - Remove unnecessary role checks
*/

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_read_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update access for own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert access for own profile" ON profiles;

-- Create new simplified policies
CREATE POLICY "profiles_select"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Any authenticated user can read their own profile
    id = auth.uid()
  );

CREATE POLICY "profiles_insert"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Users can only create their own profile
    id = auth.uid()
  );

CREATE POLICY "profiles_update"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Users can only update their own profile
    id = auth.uid()
  )
  WITH CHECK (
    -- Double-check that users can only update their own profile
    id = auth.uid()
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Create function to handle new user creation if it doesn't exist
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (
    id,
    email,
    full_name,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Add missing profiles for existing users
INSERT INTO profiles (id, email, full_name)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', '')
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.users.id
)
ON CONFLICT (id) DO NOTHING;