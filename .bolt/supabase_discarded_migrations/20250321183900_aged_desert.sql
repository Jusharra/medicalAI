-- Drop existing tables and start fresh
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Create roles table
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  permissions jsonb DEFAULT '{}'::jsonb,
  access_level integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_roles table
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- Insert default roles with dynamic UUIDs
INSERT INTO roles (name, description, permissions, access_level) VALUES
('member', 'Standard platform member', 
  jsonb_build_object(
    'can_access_member_features', true,
    'can_book_appointments', true,
    'can_view_medical_records', true
  ),
  10
),
('physician', 'Medical professional', 
  jsonb_build_object(
    'can_access_physician_features', true,
    'can_view_patients', true,
    'can_manage_appointments', true,
    'can_update_medical_records', true
  ),
  50
);

-- Create policies for roles
CREATE POLICY "roles_read_policy"
  ON roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for user_roles
CREATE POLICY "user_roles_read_policy"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_roles_insert_policy"
  ON user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create function to assign default role
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS trigger AS $$
DECLARE
  member_role_id uuid;
BEGIN
  -- Get member role ID
  SELECT id INTO member_role_id FROM roles WHERE name = 'member';
  
  -- Insert role assignment
  IF member_role_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role_id)
    VALUES (NEW.id, member_role_id)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically assign role on user creation
DROP TRIGGER IF EXISTS assign_default_role_trigger ON auth.users;
CREATE TRIGGER assign_default_role_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_role();

-- Create test user if none exist
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  'efbd2fb4-4a3b-4d6e-a553-eec02a567ba8',
  'test@vitale.health',
  crypt('Test123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Create test user's profile
INSERT INTO profiles (
  id,
  first_name,
  last_name,
  phone,
  created_at,
  updated_at
) VALUES (
  'efbd2fb4-4a3b-4d6e-a553-eec02a567ba8',
  'Test',
  'User',
  '+1-555-0123',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Ensure all users have confirmed emails
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS users_email_idx ON auth.users(email);
CREATE INDEX IF NOT EXISTS users_instance_id_idx ON auth.users(instance_id);