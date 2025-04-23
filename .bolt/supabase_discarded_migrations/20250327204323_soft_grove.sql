-- Drop existing role-related tables
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;

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

-- Insert the three roles with their permissions
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
    'medical_professional',
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

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Assign default member role
  INSERT INTO user_roles (user_id, role_name)
  VALUES (NEW.id, 'member')
  ON CONFLICT (user_id, role_name) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user handling
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

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

-- Update JWT hook function
CREATE OR REPLACE FUNCTION auth.jwt_hook()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _user_email text;
  _role_name text;
  _has_membership boolean;
BEGIN
  -- Get user info
  SELECT id, email INTO _user_id, _user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Get user's role
  SELECT role_name INTO _role_name
  FROM user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role_name
      WHEN 'super_admin' THEN 1
      WHEN 'medical_professional' THEN 2
      WHEN 'member' THEN 3
      ELSE 4
    END
  LIMIT 1;

  -- Set default role if none found
  IF _role_name IS NULL THEN
    _role_name := 'member';
  END IF;

  -- Check membership status
  SELECT EXISTS (
    SELECT 1 
    FROM memberships m
    WHERE m.profile_id = _user_id
    AND m.status = 'active'
    AND m.payment_status = 'succeeded'
  ) INTO _has_membership;

  -- Return JWT claims
  RETURN jsonb_build_object(
    'role', _role_name,
    'email', _user_email,
    'user_id', _user_id,
    'has_membership', _has_membership,
    'aud', 'authenticated',
    'iss', 'supabase',
    'exp', extract(epoch from (now() + interval '1 hour'))::integer
  );
END;
$$;

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

  -- Verify roles exist
  ASSERT EXISTS (
    SELECT 1 FROM role_permissions 
    WHERE name IN ('super_admin', 'medical_professional', 'member')
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