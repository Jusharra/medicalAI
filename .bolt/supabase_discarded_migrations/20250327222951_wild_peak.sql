-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb);

-- Create basic function first
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  user_id uuid;
  user_role text;
BEGIN
  -- Get user ID from event
  user_id := (event->>'user_id')::uuid;

  -- Get user's role
  SELECT role_name INTO user_role
  FROM user_roles
  WHERE user_id = user_id
  LIMIT 1;

  -- Get existing claims or create empty object
  claims := COALESCE(event->'claims', '{}'::jsonb);

  -- Set role claim
  claims := jsonb_set(
    claims,
    '{role}',
    to_jsonb(COALESCE(user_role, 'member'))
  );

  -- Set app metadata based on role
  IF user_role = 'super_admin' THEN
    claims := jsonb_set(
      claims,
      '{app_metadata}',
      '{"admin": true, "super_admin": true}'::jsonb
    );
  ELSIF user_role = 'admin' THEN
    claims := jsonb_set(
      claims,
      '{app_metadata}',
      '{"admin": true}'::jsonb
    );
  END IF;

  -- Return modified event
  RETURN jsonb_set(event, '{claims}', claims);
EXCEPTION WHEN OTHERS THEN
  -- Return original event on error
  RETURN event;
END;
$$;

-- Grant minimal required permissions
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO service_role;
GRANT SELECT ON user_roles TO service_role;

-- Verify function exists
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'custom_access_token_hook'
  ), 'Function custom_access_token_hook does not exist';
END $$;