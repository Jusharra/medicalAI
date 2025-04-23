/*
  # Create Roles System with Cyberpunk Theme
  
  1. Purpose
    - Create roles table with cyberpunk-themed access levels
    - Link roles to auth system
    - Set up role-based access control
    
  2. Security
    - Enable RLS
    - Add policies for role management
    - Ensure secure role assignment
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  permissions jsonb DEFAULT '{}',
  access_level integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, role_id)
);

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Insert default roles with cyberpunk theme
INSERT INTO roles (name, description, permissions, access_level) VALUES
('netrunner', 'System administrator with full access', '{"admin": true, "manage_users": true, "manage_roles": true}', 100),
('sentinel', 'Security officer with elevated access', '{"manage_users": true, "view_logs": true}', 75),
('operator', 'Standard system operator', '{"basic_access": true, "view_own": true}', 50),
('initiate', 'Basic user access level', '{"basic_access": true}', 25),
('ghost', 'Read-only access', '{"view_only": true}', 10);

-- Create policies
CREATE POLICY "Netrunners can manage roles"
  ON roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'netrunner'
    )
  );

CREATE POLICY "Users can view assigned roles"
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

-- Create function to assign role
CREATE OR REPLACE FUNCTION assign_role(target_user_id uuid, role_name text)
RETURNS void AS $$
DECLARE
  role_id uuid;
BEGIN
  -- Check if caller is netrunner
  IF NOT check_user_role(auth.uid(), 'netrunner') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Get role ID
  SELECT id INTO role_id FROM roles WHERE name = role_name;
  IF role_id IS NULL THEN
    RAISE EXCEPTION 'Role not found';
  END IF;

  -- Assign role
  INSERT INTO user_roles (user_id, role_id, assigned_by)
  VALUES (target_user_id, role_id, auth.uid())
  ON CONFLICT (user_id, role_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add role info to user profile view
CREATE OR REPLACE VIEW user_profile_with_roles AS
SELECT 
  p.*,
  array_agg(r.name) as roles,
  max(r.access_level) as max_access_level
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY p.id;

-- Assign netrunner role to existing admin
INSERT INTO user_roles (user_id, role_id)
SELECT 
  u.id,
  r.id
FROM auth.users u
CROSS JOIN roles r
WHERE u.email = '1stchoicecyber@gmail.com'
AND r.name = 'netrunner'
ON CONFLICT DO NOTHING;