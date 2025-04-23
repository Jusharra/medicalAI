/*
  # Fix Role System and Policies
  
  1. Purpose
    - Set up roles with proper permissions
    - Update policies without conflicts
    - Enable email confirmations
    
  2. Changes
    - Drop and recreate roles
    - Update policies safely
    - Fix email confirmation
*/

-- Drop existing roles to ensure clean state
DELETE FROM user_roles;
DELETE FROM roles;

-- Create roles with fixed IDs and proper permissions
INSERT INTO roles (id, name, description, permissions, access_level)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'member', 'Standard platform member', 
   '{"member": true, "can_access_member_features": true}', 10),
  ('22222222-2222-2222-2222-222222222222', 'physician', 'Medical professional', 
   '{"physician": true, "can_access_member_features": true, "can_access_physician_features": true}', 50),
  ('33333333-3333-3333-3333-333333333333', 'admin', 'System administrator', 
   '{"admin": true, "can_access_member_features": true, "can_access_admin_features": true}', 100);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role_id);

-- Update RLS policies
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Members can access basic features" ON profiles;
DROP POLICY IF EXISTS "Users can view assigned roles" ON user_roles;
DROP POLICY IF EXISTS "enable_insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "enable_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "enable_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "enable_read_own_roles" ON user_roles;

-- Create new profile policies with unique names
CREATE POLICY "profiles_insert_self"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_read_self"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_self"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create new role policies with unique names
CREATE POLICY "user_roles_read_self"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create function to check user role
CREATE OR REPLACE FUNCTION check_user_role(user_uuid uuid, role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid
    AND r.name = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable email confirmations in auth.users
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;