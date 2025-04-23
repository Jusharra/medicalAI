/*
  # Assign Member Role to Specific User
  
  1. Purpose
    - Assign member role to qreative.ambitions@gmail.com
    - Ensure user has proper dashboard access
    
  2. Changes
    - Add member role assignment
    - Verify user profile exists
*/

DO $$
DECLARE
  target_user_id uuid;
  member_role_id uuid;
BEGIN
  -- Get user ID from email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'qreative.ambitions@gmail.com'
  LIMIT 1;

  -- Get member role ID
  SELECT id INTO member_role_id
  FROM roles
  WHERE name = 'member'
  LIMIT 1;

  -- If user exists, assign role
  IF target_user_id IS NOT NULL AND member_role_id IS NOT NULL THEN
    -- Insert role assignment
    INSERT INTO user_roles (user_id, role_id)
    VALUES (target_user_id, member_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;

    -- Ensure user profile exists
    INSERT INTO user_profiles (user_id, email)
    SELECT target_user_id, 'qreative.ambitions@gmail.com'
    WHERE NOT EXISTS (
      SELECT 1 FROM user_profiles WHERE user_id = target_user_id
    );
  END IF;
END $$;