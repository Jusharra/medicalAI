/*
  # Add Member Role
  
  1. Changes
    - Add member role to roles table
    - Update role permissions structure
    - Add policies for member access
*/

-- Add member role
INSERT INTO roles (name, description, permissions) VALUES
('member', 'Standard platform member', '{"member": true}')
ON CONFLICT (name) DO NOTHING;

-- Update role permissions to include member access
UPDATE roles 
SET permissions = permissions || '{"can_access_member_features": true}'::jsonb
WHERE name = 'member';

-- Ensure admin and physician roles can also access member features
UPDATE roles 
SET permissions = permissions || '{"can_access_member_features": true}'::jsonb
WHERE name IN ('admin', 'physician');

-- Create policy for member access
CREATE POLICY "Members can access basic features"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND (r.permissions->>'member')::boolean = true
    )
  );

-- Create function to check if user has member access
CREATE OR REPLACE FUNCTION has_member_access(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid
    AND (r.permissions->>'can_access_member_features')::boolean = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;