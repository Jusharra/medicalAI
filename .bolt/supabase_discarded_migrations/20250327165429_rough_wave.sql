/*
  # Create User Teams Table
  
  1. Purpose
    - Store team membership information
    - Track team admin roles
    - Enable team-based access control
    
  2. Security
    - Enable RLS
    - Add policies for team membership access
    - Ensure users can only access their own team data
*/

-- Create user_teams table
CREATE TABLE IF NOT EXISTS user_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, team_id)
);

-- Enable RLS
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own team memberships"
  ON user_teams
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Team admins can manage team members"
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_teams ut
      WHERE ut.team_id = user_teams.team_id
      AND ut.user_id = auth.uid()
      AND ut.is_admin = true
    )
  );

-- Create indexes
CREATE INDEX idx_user_teams_user_id ON user_teams(user_id);
CREATE INDEX idx_user_teams_team_id ON user_teams(team_id);
CREATE INDEX idx_user_teams_admin ON user_teams(team_id, is_admin);

-- Create trigger for updated_at
CREATE TRIGGER update_user_teams_updated_at
  BEFORE UPDATE ON user_teams
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Add sample team memberships
INSERT INTO user_teams (user_id, team_id, is_admin)
SELECT 
  auth.uid() as user_id,
  id as team_id,
  true as is_admin
FROM teams
WHERE EXISTS (
  SELECT 1 FROM auth.users WHERE auth.users.id = auth.uid()
)
LIMIT 1;