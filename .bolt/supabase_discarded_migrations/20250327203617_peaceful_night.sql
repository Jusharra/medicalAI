-- Drop existing JWT hook function
DROP FUNCTION IF EXISTS auth.jwt_hook();

-- Create custom access token hook function
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  is_admin boolean;
BEGIN
  -- Check if the user is marked as admin in the profiles table
  SELECT is_admin INTO is_admin 
  FROM profiles 
  WHERE user_id = (event->>'user_id')::uuid;

  -- Proceed only if the user is an admin
  IF is_admin THEN
    claims := event->'claims';

    -- Check if 'app_metadata' exists in claims
    IF jsonb_typeof(claims->'app_metadata') IS NULL THEN
      -- If 'app_metadata' does not exist, create an empty object
      claims := jsonb_set(claims, '{app_metadata}', '{}');
    END IF;

    -- Set a claim of 'admin'
    claims := jsonb_set(claims, '{app_metadata,admin}', 'true');

    -- Update the 'claims' object in the original event
    event := jsonb_set(event, '{claims}', claims);
  END IF;

  -- Return the modified or original event
  RETURN event;
END;
$$;

-- Grant necessary permissions
GRANT ALL ON TABLE public.profiles TO supabase_auth_admin;
REVOKE ALL ON TABLE public.profiles FROM authenticated, anon, public;

-- Verify function exists
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'custom_access_token_hook'
  ), 'Function custom_access_token_hook does not exist';
END $$;