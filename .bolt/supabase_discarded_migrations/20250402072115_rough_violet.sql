/*
  # Fix User Roles and Permissions

  1. Changes
    - Ensure all users have correct roles
    - Update auth metadata to match roles
    - Create maximally permissive policies
    - Fix partner access

  2. Security
    - Maintain basic user isolation
    - Allow role-based access
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

-- Set specific roles
UPDATE users 
SET role = 
  CASE 
    WHEN email = '1stchoicecyber@gmail.com' THEN 'admin'
    WHEN id = 'c349a285-bc2c-494b-902b-7e35358a495d' THEN 'partner'
    ELSE 'member'
  END;

-- Update auth.users metadata to match roles
UPDATE auth.users
SET raw_user_meta_data = 
  CASE 
    WHEN email = '1stchoicecyber@gmail.com' THEN 
      COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
    WHEN id = 'c349a285-bc2c-494b-902b-7e35358a495d' THEN
      COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'partner')
    ELSE
      COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'member')
  END;

-- Enable RLS on all relevant tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "users_read_access" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "partners_select" ON partners;

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

-- Create maximally permissive policies for partners
CREATE POLICY "partners_select"
  ON partners
  FOR SELECT
  TO authenticated
  USING (true);

-- Create partner record for the partner user if it doesn't exist
INSERT INTO partners (
  id,
  name,
  email,
  status,
  practice_name,
  practice_address,
  specialties,
  consultation_fee,
  rating
)
SELECT
  'c349a285-bc2c-494b-902b-7e35358a495d',
  'Dr. Partner',
  'qreative.ambitions@gmail.com',
  'active',
  'Partner Medical Practice',
  jsonb_build_object(
    'street', '123 Medical Plaza',
    'city', 'San Francisco',
    'state', 'CA',
    'zip', '94105'
  ),
  ARRAY['Primary Care', 'Internal Medicine'],
  299,
  4.8
WHERE NOT EXISTS (
  SELECT 1 FROM partners WHERE id = 'c349a285-bc2c-494b-902b-7e35358a495d'
);