/*
  # Insert Default Roles
  
  1. Purpose
    - Add default system roles
    - Set up role hierarchy
    - Define role permissions
    
  2. Changes
    - Add super_admin role
    - Add physician role
    - Add team_admin role
    - Add member role
*/

-- Drop existing roles to avoid conflicts
DELETE FROM roles WHERE name IN ('super_admin', 'physician', 'team_admin', 'member');

-- Insert default roles with descriptions and permissions
INSERT INTO roles (id, name, description, permissions) VALUES
  (
    gen_random_uuid(),
    'super_admin',
    'Full system access with unrestricted permissions',
    jsonb_build_object(
      'all', true,
      'system_config', true,
      'user_management', true,
      'role_management', true
    )
  ),
  (
    gen_random_uuid(),
    'physician',
    'Medical professional with patient management capabilities',
    jsonb_build_object(
      'patient_management', true,
      'medical_records', true,
      'prescriptions', true,
      'appointments', true
    )
  ),
  (
    gen_random_uuid(),
    'team_admin',
    'Team administrator with member management capabilities',
    jsonb_build_object(
      'team_management', true,
      'member_management', true,
      'reports', true
    )
  ),
  (
    gen_random_uuid(),
    'member',
    'Standard member access',
    jsonb_build_object(
      'profile', true,
      'appointments', true,
      'messages', true,
      'health_records', true
    )
  );

-- Create index for role lookup by name if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_roles_name_lookup ON roles(name);

-- Verify roles were inserted
DO $$ 
BEGIN
  ASSERT (SELECT COUNT(*) FROM roles WHERE name IN ('super_admin', 'physician', 'team_admin', 'member')) = 4, 
    'Not all required roles were inserted';
END $$;