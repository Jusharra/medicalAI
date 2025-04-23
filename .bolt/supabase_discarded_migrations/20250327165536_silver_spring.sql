/*
  # Create Roles Table
  
  1. Purpose
    - Store system-wide role definitions
    - Enable role-based access control
    - Track user permissions
    
  2. Security
    - Enable RLS
    - Add policies for role access
    - Ensure proper access control
*/

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  permissions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view roles"
  ON roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX idx_roles_name ON roles(name);

-- Create trigger for updated_at
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
  ('admin', 'Full system access', '{"all": true}'),
  ('member', 'Standard member access', '{"read": true, "write": true}'),
  ('guest', 'Limited access', '{"read": true}');

-- Create user_roles table to link users with roles
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Enable RLS on user_roles
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles
CREATE POLICY "Users can view own roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for user_roles
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- Create trigger for user_roles updated_at
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Add default role for existing users
INSERT INTO user_roles (user_id, role_id)
SELECT 
  u.id as user_id,
  r.id as role_id
FROM auth.users u
CROSS JOIN roles r
WHERE r.name = 'member'
AND NOT EXISTS (
  SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
)
ON CONFLICT DO NOTHING;