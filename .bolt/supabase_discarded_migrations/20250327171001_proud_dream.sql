/*
  # Add JWT Hook for User Roles
  
  1. Purpose
    - Add user roles to JWT tokens
    - Enable role-based access control in the application
    - Provide role information to the client
    
  2. Changes
    - Create or replace JWT hook function
    - Return user roles in JWT claims
*/

-- Create or replace the JWT hook function
CREATE OR REPLACE FUNCTION auth.jwt_hook()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_names text[];
BEGIN
  -- Get all roles for the current user
  SELECT array_agg(r.name)
  INTO role_names
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = auth.uid();

  -- Return JWT claims
  RETURN jsonb_build_object(
    'role', COALESCE(role_names, ARRAY[]::text[]),
    'https://hasura.io/jwt/claims', jsonb_build_object(
      'x-hasura-allowed-roles', COALESCE(role_names, ARRAY['authenticated']),
      'x-hasura-default-role', COALESCE(role_names[1], 'authenticated'),
      'x-hasura-user-id', auth.uid()::text
    )
  );
END;
$$;