/*
  # Create JWT Hook Function
  
  1. Purpose
    - Create a function to generate JWT claims with user roles
    - Enable role-based access control in tokens
    - Avoid direct database configuration changes
    
  2. Changes
    - Create JWT hook function in auth schema
    - Add role claims to JWT payload
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
  user_id uuid;
BEGIN
  -- Get current user ID
  user_id := auth.uid();
  
  -- Get all roles for the current user
  SELECT array_agg(r.name)
  INTO role_names
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = user_id;

  -- Return JWT claims
  RETURN jsonb_build_object(
    'role', COALESCE(role_names, ARRAY[]::text[]),
    'https://hasura.io/jwt/claims', jsonb_build_object(
      'x-hasura-allowed-roles', COALESCE(role_names, ARRAY['authenticated']),
      'x-hasura-default-role', COALESCE(role_names[1], 'authenticated'),
      'x-hasura-user-id', user_id::text
    )
  );
END;
$$;