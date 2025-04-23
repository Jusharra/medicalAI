/*
  # Enable RLS and Add Security Policies
  
  1. Purpose
    - Enable Row Level Security on core tables
    - Add appropriate access policies
    - Ensure data security and access control
    
  2. Changes
    - Enable RLS on teams, user_teams, user_roles, and user_profiles tables
    - Add policies for data access
    - Create necessary indexes for performance
*/

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for teams table
CREATE POLICY "teams_view_all"
  ON teams
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for user_teams table
CREATE POLICY "user_teams_view_own"
  ON user_teams
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_teams_manage_as_admin"
  ON user_teams
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_teams ut
      WHERE ut.team_id = user_teams.team_id
      AND ut.user_id = auth.uid()
      AND ut.is_admin = true
    )
  );

-- Policies for user_roles table
CREATE POLICY "user_roles_view_own"
  ON user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_roles_manage_as_admin"
  ON user_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'super_admin'
    )
  );

-- Policies for user_profiles table
CREATE POLICY "user_profiles_view_own"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_profiles_manage_own"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_teams_user_lookup ON user_teams(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_lookup ON user_roles(user_id, role_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_lookup ON user_profiles(user_id);