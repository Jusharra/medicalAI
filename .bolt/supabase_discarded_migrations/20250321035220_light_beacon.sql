-- Drop existing roles to ensure clean state
DELETE FROM user_roles;
DELETE FROM roles;

-- Create roles with fixed IDs
INSERT INTO roles (id, name, description, permissions, access_level)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'member', 'Standard platform member', '{"member": true, "can_access_member_features": true}', 10),
  ('22222222-2222-2222-2222-222222222222', 'physician', 'Medical professional', '{"physician": true, "can_access_member_features": true}', 50),
  ('33333333-3333-3333-3333-333333333333', 'admin', 'System administrator', '{"admin": true, "can_access_member_features": true}', 100);

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role_id);

-- Update policies
DROP POLICY IF EXISTS "Members can access basic features" ON profiles;
CREATE POLICY "Members can access basic features"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND (r.permissions->>'can_access_member_features')::boolean = true
    )
  );