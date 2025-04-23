-- Drop existing role-related tables
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Create role_permissions table
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_roles table
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name text REFERENCES role_permissions(name) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_name)
);

-- Enable RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for role_permissions
CREATE POLICY "Anyone can view role permissions"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for user_roles
CREATE POLICY "Users can view own roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_name ON user_roles(role_name);
CREATE INDEX idx_role_permissions_name ON role_permissions(name);

-- Insert default roles
INSERT INTO role_permissions (name, description, permissions) VALUES
  (
    'super_admin',
    'Full system access with unrestricted permissions',
    '{
      "all": true,
      "system_config": true,
      "user_management": true,
      "role_management": true,
      "analytics": true
    }'
  ),
  (
    'admin',
    'System administration access',
    '{
      "user_management": true,
      "content_management": true,
      "analytics": true
    }'
  ),
  (
    'physician',
    'Medical professional access',
    '{
      "patient_management": true,
      "medical_records": true,
      "prescriptions": true,
      "appointments": true
    }'
  ),
  (
    'member',
    'Standard member access',
    '{
      "profile": true,
      "appointments": true,
      "messages": true,
      "health_records": true
    }'
  );

-- Assign super_admin role to specified user
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get user ID
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'qreative.ambitions@gmail.com';

  IF target_user_id IS NOT NULL THEN
    -- Remove existing roles
    DELETE FROM user_roles WHERE user_id = target_user_id;

    -- Assign super_admin role
    INSERT INTO user_roles (user_id, role_name)
    VALUES (target_user_id, 'super_admin')
    ON CONFLICT (user_id, role_name) DO NOTHING;

    RAISE NOTICE 'Successfully assigned super_admin role to user';
  ELSE
    RAISE EXCEPTION 'Could not find user';
  END IF;
END $$;

-- Verify setup
DO $$
BEGIN
  -- Verify tables exist
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'role_permissions'
  ), 'role_permissions table does not exist';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_roles'
  ), 'user_roles table does not exist';

  -- Verify default roles exist
  ASSERT EXISTS (
    SELECT 1 FROM role_permissions 
    WHERE name IN ('super_admin', 'admin', 'physician', 'member')
  ), 'Default roles are missing';

  -- Verify super_admin assignment
  ASSERT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN auth.users u ON ur.user_id = u.id
    WHERE u.email = 'qreative.ambitions@gmail.com'
    AND ur.role_name = 'super_admin'
  ), 'Super admin role not assigned correctly';
END $$;