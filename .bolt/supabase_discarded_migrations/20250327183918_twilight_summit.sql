/*
  # Fix JWT Claims and Role Assignment
  
  1. Purpose
    - Fix JWT claims to properly reflect user roles
    - Ensure super_admin role is properly assigned
    - Update JWT hook to handle multiple roles
    
  2. Changes
    - Drop existing JWT hook
    - Create improved version with proper role handling
    - Fix role assignment for super admin
*/

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
  _user_roles text[];
  _primary_role text;
  _has_active_membership boolean;
BEGIN
  -- Get current user info
  SELECT id, email INTO _user_id, _user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Get all user roles
  SELECT array_agg(r.name) INTO _user_roles
  FROM roles r
  JOIN user_roles ur ON ur.role_id = r.id
  WHERE ur.user_id = _user_id;

  -- Get primary role (prioritizing super_admin > admin > physician > member)
  SELECT name INTO _primary_role
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
  IF _primary_role IS NULL THEN
    _primary_role := 'authenticated';
    _user_roles := ARRAY['authenticated'];
  END IF;

  -- Check active membership
  SELECT EXISTS (
    SELECT 1 
    FROM memberships m
    WHERE m.profile_id = _user_id
    AND m.status = 'active'
    AND m.payment_status = 'succeeded'
    AND (m.current_period_end > now() OR m.current_period_end IS NULL)
  ) INTO _has_active_membership;

  -- Return JWT claims
  RETURN jsonb_build_object(
    'role', _primary_role,
    'roles', _user_roles,
    'email', _user_email,
    'user_id', _user_id,
    'has_membership', _has_active_membership,
    'aud', 'authenticated',
    'iss', 'supabase',
    'exp', extract(epoch from (now() + interval '1 hour'))::integer,
    'https://hasura.io/jwt/claims', jsonb_build_object(
      'x-hasura-allowed-roles', array_append(_user_roles, 'authenticated'),
      'x-hasura-default-role', _primary_role,
      'x-hasura-user-id', _user_id::text,
      'x-hasura-user-email', _user_email,
      'x-hasura-has-membership', _has_active_membership::text
    )
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

  -- Get or create super_admin role
  INSERT INTO roles (name, description, permissions)
  VALUES (
    'super_admin',
    'Full system access with unrestricted permissions',
    jsonb_build_object(
      'all', true,
      'system_config', true,
      'user_management', true,
      'role_management', true
    )
  )
  ON CONFLICT (name) DO UPDATE
  SET permissions = EXCLUDED.permissions
  RETURNING id INTO super_admin_role_id;

  -- If user exists, ensure super_admin role
  IF target_user_id IS NOT NULL THEN
    -- Remove any existing roles
    DELETE FROM user_roles WHERE user_id = target_user_id;

    -- Assign super_admin role
    INSERT INTO user_roles (user_id, role_id)
    VALUES (target_user_id, super_admin_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    RAISE NOTICE 'Successfully assigned super_admin role to user';
  ELSE
    RAISE EXCEPTION 'User not found';
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