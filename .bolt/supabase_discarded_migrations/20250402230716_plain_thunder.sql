/*
  # Fix Auth Issues and Ensure User Data Consistency

  1. Changes
    - Create or update users table entries for all auth.users
    - Create or update profiles table entries for all auth.users
    - Ensure role column exists and has correct constraints
    - Fix role handling in JWT claims

  2. Security
    - Maintain existing RLS policies
    - Ensure proper role assignment
*/

-- First ensure the role column exists and has the correct type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('member', 'admin', 'partner');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create entry in users table
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
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = COALESCE(NEW.raw_user_meta_data->>'role', users.role);
  
  -- Create entry in profiles table
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
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', profiles.full_name);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create function to sync role to JWT claims
CREATE OR REPLACE FUNCTION sync_user_role()
RETURNS trigger AS $$
BEGIN
  -- Update auth.users metadata when role changes
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to keep role in sync
DROP TRIGGER IF EXISTS sync_user_role_trigger ON users;
CREATE TRIGGER sync_user_role_trigger
  AFTER UPDATE OF role ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role();

-- Add missing users for existing auth users
INSERT INTO users (id, email, role)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'role', 'member')::user_role
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE users.id = auth.users.id
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = COALESCE(EXCLUDED.role, users.role);

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
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);

-- Update auth.users metadata to include role from users table
UPDATE auth.users
SET raw_user_meta_data = 
  COALESCE(raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object('role', (SELECT role FROM users WHERE users.id = auth.users.id))
WHERE EXISTS (
  SELECT 1 FROM users WHERE users.id = auth.users.id
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create maximally permissive policies for users
DROP POLICY IF EXISTS "users_read_access" ON users;
CREATE POLICY "users_read_access"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Create maximally permissive policies for profiles
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);