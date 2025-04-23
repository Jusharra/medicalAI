/*
  # Fix Partner Role Assignment

  1. Changes
    - Set partner role for specific user
    - Update auth.users metadata to include role
    - Ensure role is properly synced to JWT claims

  2. Security
    - Maintain existing RLS policies
    - Update role only for specific user
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

-- Set partner role for specific user
UPDATE users 
SET role = 'partner'
WHERE id = 'c349a285-bc2c-494b-902b-7e35358a495d';

-- Update auth.users metadata to include role
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'partner')
WHERE id = 'c349a285-bc2c-494b-902b-7e35358a495d';

-- Create function to sync role to JWT claims if it doesn't exist
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

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "users_read_access" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- Create new policies using JWT claims
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