/*
  # Add Team Access Function
  
  1. Purpose
    - Create a function to return all teams a user has access to
    - Enable secure team data retrieval
    - Support role-based access control
    
  2. Security
    - Use SECURITY DEFINER for proper permissions
    - Set search path to public for safety
*/

-- Create function to return all accessible teams
CREATE OR REPLACE FUNCTION return_all_teams_where_user_has_access(user_id uuid)
RETURNS SETOF teams
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT t.*
  FROM teams t
  JOIN user_teams ut ON ut.team_id = t.id
  WHERE ut.user_id = user_id
  OR EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_id
    AND r.name = 'super_admin'
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION return_all_teams_where_user_has_access(uuid) TO authenticated;

-- Add comment explaining function usage
COMMENT ON FUNCTION return_all_teams_where_user_has_access(uuid) IS 
'Returns all teams that a user has access to, either through team membership or super admin role';

-- Create index to optimize team lookups if not exists
CREATE INDEX IF NOT EXISTS idx_user_teams_lookup 
ON user_teams (user_id, team_id);