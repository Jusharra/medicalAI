/*
  # Create Teams Table
  
  1. Purpose
    - Store team information
    - Enable team management
    - Support team-based access control
    
  2. Security
    - Enable RLS
    - Add policies for team access
*/

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "teams_select_policy"
  ON teams
  FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX idx_teams_created_at ON teams(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Add some sample teams
INSERT INTO teams (name) VALUES
  ('Engineering'),
  ('Marketing'),
  ('Sales'),
  ('Support');