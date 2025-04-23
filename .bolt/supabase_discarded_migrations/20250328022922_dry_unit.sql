/*
  # Fix Super Admin Assignment
  
  1. Purpose
    - Set super admin status for specific user
    - Fix ambiguous column references
    - Add proper verification
    
  2. Changes
    - Use table aliases to avoid ambiguity
    - Add explicit column references
    - Improve error handling
*/

DO $$
DECLARE
  target_user_id uuid := 'd6f39b4e-edaf-4815-98d7-ff1e4416319b';
  profile_exists boolean;
  admin_status boolean;
  has_role boolean;
BEGIN
  -- Check profile exists and super admin status using table alias
  SELECT 
    EXISTS(SELECT 1 FROM profiles p WHERE p.id = target_user_id) as does_exist,
    COALESCE((SELECT p.is_super_admin FROM profiles p WHERE p.id = target_user_id), false) as admin_flag
  INTO profile_exists, admin_status;

  -- Check role assignment
  SELECT EXISTS(
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = target_user_id 
    AND ur.role_name = 'super_admin'
  ) INTO has_role;

  RAISE NOTICE 'Current state - Profile exists: %, Is super admin: %, Has role: %', 
    profile_exists, admin_status, has_role;

  -- Fix profile if needed
  IF NOT profile_exists THEN
    INSERT INTO profiles (
      id,
      user_id,
      email,
      is_super_admin
    ) VALUES (
      target_user_id,
      target_user_id,
      'qreative.ambitions@gmail.com',
      true
    );
    RAISE NOTICE 'Created missing profile';
  ELSIF NOT admin_status THEN
    UPDATE profiles 
    SET 
      is_super_admin = true,
      updated_at = now()
    WHERE id = target_user_id;
    RAISE NOTICE 'Updated is_super_admin flag';
  END IF;

  -- Fix role assignment if needed
  IF NOT has_role THEN
    -- Remove any existing roles first
    DELETE FROM user_roles WHERE user_id = target_user_id;
    
    -- Add super_admin role
    INSERT INTO user_roles (
      user_id,
      role_name
    ) VALUES (
      target_user_id,
      'super_admin'
    ) ON CONFLICT (user_id, role_name) DO NOTHING;
    RAISE NOTICE 'Added super_admin role';
  END IF;

  -- Final verification
  IF NOT EXISTS (
    SELECT 1 
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
    WHERE p.id = target_user_id 
    AND p.is_super_admin = true
    AND ur.role_name = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Failed to properly set up super admin user';
  END IF;

  RAISE NOTICE 'Successfully verified super admin setup';
END $$;