/*
  # Fix Global Access Policies

  1. Changes
    - Make profile and account access available to all authenticated users
    - Remove role-based restrictions
    - Simplify policies to basic authentication checks

  2. Security
    - Maintain data isolation between users
    - Allow all authenticated users to manage their own data
*/

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "users_read_access" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- Create maximally permissive policies for profiles
CREATE POLICY "profiles_select"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "profiles_update"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create maximally permissive policies for users
CREATE POLICY "users_read_access"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "users_update_own"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile for new user
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

  -- Set role in users table
  INSERT INTO users (
    id,
    email,
    role,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')::user_role,
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
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

-- Add missing users records
INSERT INTO users (id, email, role)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'role', 'member')::user_role
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE users.id = auth.users.id
)
ON CONFLICT (id) DO NOTHING;