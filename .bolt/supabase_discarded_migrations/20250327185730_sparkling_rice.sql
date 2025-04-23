-- Drop existing role-related objects
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS auth.jwt_hook() CASCADE;

-- Recreate roles table with id as primary key
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  permissions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create user_roles table referencing role id
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Insert base roles
INSERT INTO roles (id, name, description, permissions) VALUES
  (gen_random_uuid(), 'super_admin', 'Full system access with unrestricted permissions', '{"all": true}'),
  (gen_random_uuid(), 'admin', 'System administration access', '{"admin": true}'),
  (gen_random_uuid(), 'physician', 'Medical professional access', '{"medical": true}'),
  (gen_random_uuid(), 'member', 'Standard member access', '{"member": true}');

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  member_role_id uuid;
BEGIN
  -- Get member role id
  SELECT id INTO member_role_id FROM roles WHERE name = 'member';

  -- Create profile
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  -- Assign default member role
  IF member_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (NEW.id, member_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user handling
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

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

  -- Get primary role (prioritizing super_admin)
  SELECT r.name INTO _role_name
  FROM roles r
  JOIN user_roles ur ON ur.role_id = r.id
  WHERE ur.user_id = _user_id
  ORDER BY 
    CASE r.name
      WHEN 'super_admin' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'physician' THEN 3
      WHEN 'member' THEN 4
      ELSE 5
    END
  LIMIT 1;

  -- Set default role if none found
  IF _role_name IS NULL THEN
    _role_name := 'authenticated';
  END IF;

  -- Return JWT claims
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

-- Assign super_admin role to specific user
DO $$
DECLARE
  target_user_id uuid;
  super_admin_role_id uuid;
BEGIN
  -- Get user ID
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'qreative.ambitions@gmail.com';

  -- Get super_admin role ID
  SELECT id INTO super_admin_role_id
  FROM roles
  WHERE name = 'super_admin';

  IF target_user_id IS NOT NULL AND super_admin_role_id IS NOT NULL THEN
    -- Remove existing roles
    DELETE FROM user_roles WHERE user_id = target_user_id;

    -- Assign super_admin role
    INSERT INTO user_roles (user_id, role_id)
    VALUES (target_user_id, super_admin_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    RAISE NOTICE 'Successfully assigned super_admin role to user';
  ELSE
    RAISE EXCEPTION 'Could not find user or super_admin role';
  END IF;
END $$;

-- Verify setup
DO $$
DECLARE
  role_count integer;
  super_admin_assigned boolean;
BEGIN
  -- Check roles were created
  SELECT COUNT(*) INTO role_count FROM roles;
  ASSERT role_count = 4, 'Not all roles were created';

  -- Verify super_admin assignment
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    JOIN auth.users u ON ur.user_id = u.id
    WHERE u.email = 'qreative.ambitions@gmail.com'
    AND r.name = 'super_admin'
  ) INTO super_admin_assigned;

  ASSERT super_admin_assigned = true, 'Super admin role was not assigned correctly';
END $$;