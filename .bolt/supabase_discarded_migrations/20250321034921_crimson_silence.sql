-- Create default role IDs
INSERT INTO roles (id, name, description, permissions)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'member', 'Standard platform member', '{"member": true}'),
  ('22222222-2222-2222-2222-222222222222', 'physician', 'Medical professional', '{"physician": true}')
ON CONFLICT (name) DO UPDATE
SET permissions = EXCLUDED.permissions;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role_id);