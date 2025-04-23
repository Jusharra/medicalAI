/*
  # Assign Super Admin Role
  
  1. Purpose
    - Assign super_admin role to specified user
    - Ensure user has proper profile setup
    
  2. Changes
    - Get user ID from email
    - Get super_admin role ID
    - Create role assignment
*/

DO $$
DECLARE
  target_user_id uuid;
  super_admin_role_id uuid;
  user_exists boolean;
BEGIN
  -- Check if user exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'qreative.ambitions@gmail.com'
  ) INTO user_exists;

  -- Get user ID
  IF user_exists THEN
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = 'qreative.ambitions@gmail.com';
  ELSE
    RAISE EXCEPTION 'User with email qreative.ambitions@gmail.com does not exist';
  END IF;

  -- Get super_admin role ID
  SELECT id INTO super_admin_role_id
  FROM roles
  WHERE name = 'super_admin';

  -- If user exists and role exists, assign role
  IF target_user_id IS NOT NULL AND super_admin_role_id IS NOT NULL THEN
    -- Remove any existing roles for this user
    DELETE FROM user_roles WHERE user_id = target_user_id;

    -- Insert super_admin role assignment
    INSERT INTO user_roles (user_id, role_id)
    VALUES (target_user_id, super_admin_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    -- Ensure user profile exists
    INSERT INTO user_profiles (user_id, email)
    VALUES (target_user_id, 'qreative.ambitions@gmail.com')
    ON CONFLICT (user_id) DO NOTHING;

    -- Ensure user preferences exist
    INSERT INTO user_preferences (user_id)
    VALUES (target_user_id)
    ON CONFLICT (user_id) DO NOTHING;

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