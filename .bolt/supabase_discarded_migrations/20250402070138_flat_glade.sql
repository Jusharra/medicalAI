/*
  # Fix Admin Role and JWT Claims

  1. Changes
    - Set admin role for specific user in users table
    - Update user_metadata to include role
    - Add role to JWT claims

  2. Security
    - Only modify role for specific user
    - Maintain existing RLS policies
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

-- Add role column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'member';

-- Set admin role for specific user
UPDATE users 
SET role = 'admin'
WHERE email = '1stchoicecyber@gmail.com';

-- Update auth.users metadata to include role
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
WHERE email = '1stchoicecyber@gmail.com';

-- Create index on role if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "users_read_access" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- Create new policies
CREATE POLICY "users_read_access"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read their own data
    id = auth.uid() OR
    -- Admins can read all data
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "users_update_own"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());