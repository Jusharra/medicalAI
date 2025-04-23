-- Drop existing JWT hook function
DROP FUNCTION IF EXISTS auth.jwt_hook();

-- Create improved JWT hook function
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

  -- Get user's role (prioritizing super_admin)
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

-- Ensure super_admin role exists and is assigned
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

-- Verify role assignment
DO $$
DECLARE
  role_assigned boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    JOIN auth.users u ON ur.user_id = u.id
    WHERE u.email = 'qreative.ambitions@gmail.com'
    AND r.name = 'super_admin'
  ) INTO role_assigned;

  ASSERT role_assigned = true, 'Super admin role was not assigned successfully';
END $$;