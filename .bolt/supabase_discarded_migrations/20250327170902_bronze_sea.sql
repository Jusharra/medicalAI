/*
  # Add Super Admin Role Management Policy
  
  1. Purpose
    - Allow super admins to manage user roles
    - Ensure proper access control for role management
    
  2. Changes
    - Drop existing policy if it exists
    - Create new policy for super admin role management
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Super Admin can manage roles" ON user_roles;
    DROP POLICY IF EXISTS "user_roles_super_admin_manage" ON user_roles;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create policy for super admin role management
CREATE POLICY "user_roles_super_admin_manage"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'super_admin'
    )
  );