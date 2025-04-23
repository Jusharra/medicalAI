-- Drop existing objects
DROP FUNCTION IF EXISTS auth.jwt_hook();
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;

-- Create role_permissions table
CREATE TABLE role_permissions (
  role_name text PRIMARY KEY,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create user_roles table
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name text REFERENCES role_permissions(role_name) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_name)
);

-- Enable RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view role permissions"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view own roles"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_name ON user_roles(role_name);

-- Insert default roles
INSERT INTO role_permissions (role_name, description, permissions) VALUES
  ('super_admin', 'Full system access', '{"all": true}'::jsonb),
  ('admin', 'System administration access', '{"admin": true}'::jsonb),
  ('physician', 'Medical professional access', '{"medical": true}'::jsonb),
  ('member', 'Standard member access', '{"basic": true}'::jsonb);

-- Create JWT hook function
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
BEGIN
  -- Get user info
  SELECT id, email INTO _user_id, _user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Get user role
  SELECT role_name INTO _role_name
  FROM user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role_name
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'physician' THEN 3
      ELSE 4
    END
  LIMIT 1;

  -- Default to member if no role found
  IF _role_name IS NULL THEN
    _role_name := 'member';
  END IF;

  -- Return claims
  RETURN jsonb_build_object(
    'role', _role_name,
    'email', _user_email,
    'user_id', _user_id,
    'aud', 'authenticated',
    'iss', 'supabase',
    'exp', extract(epoch from (now() + interval '1 hour'))::integer
  );
END;
$$;

-- Assign super_admin role to specified user
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'qreative.ambitions@gmail.com';

  IF target_user_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_name)
    VALUES (target_user_id, 'super_admin')
    ON CONFLICT (user_id, role_name) DO NOTHING;
  END IF;
END $$;