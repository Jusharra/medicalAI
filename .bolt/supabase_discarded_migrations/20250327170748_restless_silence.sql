/*
  # Add Team Admin Management Policy
  
  1. Purpose
    - Allow team admins to manage their teams
    - Ensure proper access control for team management
    
  2. Changes
    - Drop existing policy if it exists
    - Create new policy for team admin management
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can manage their teams" ON teams;
    DROP POLICY IF EXISTS "teams_admin_manage" ON teams;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create policy for team admin management
CREATE POLICY "teams_admin_manage"
  ON teams
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_teams ut
      WHERE ut.user_id = auth.uid()
      AND ut.team_id = teams.id
      AND ut.is_admin = true
    )
  );