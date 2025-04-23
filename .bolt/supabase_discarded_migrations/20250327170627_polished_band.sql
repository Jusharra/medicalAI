/*
  # Add Team Access Policy
  
  1. Purpose
    - Add policy for team access
    - Ensure users can only access their own teams
    
  2. Changes
    - Drop existing policy if it exists
    - Create new policy for team access
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can access their teams" ON user_teams;
    DROP POLICY IF EXISTS "user_teams_view_own" ON user_teams;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create policy for team access
CREATE POLICY "user_teams_view_own"
  ON user_teams
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);