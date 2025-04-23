/*
  # Fix Auth Hook Function
  
  1. Purpose
    - Fix custom access token hook
    - Improve error handling
    - Add proper logging
    
  2. Changes
    - Update hook function with better error handling
    - Add debug logging
    - Fix permissions
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.custom_access_token_hook(jsonb);

-- Create improved custom access token hook
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  user_id uuid;
  is_admin boolean;
  user_role text;
BEGIN
  -- Extract user_id from event and convert to UUID
  user_id := (event->>'user_id')::uuid;
  
  -- Log the received event for debugging
  RAISE NOTICE 'Processing auth hook for user %', user_id;

  -- Get user role and admin status
  SELECT p.is_admin, r.role_name
  INTO is_admin, user_role
  FROM profiles p
  LEFT JOIN user_roles r ON r.user_id = p.user_id
  WHERE p.user_id = user_id;

  -- Log the retrieved values
  RAISE NOTICE 'User % - is_admin: %, role: %', user_id, is_admin, user_role;

  -- Get the claims object
  claims := event->'claims';
  IF claims IS NULL THEN
    claims := '{}'::jsonb;
  END IF;

  -- Add role information
  claims := jsonb_set(
    claims,
    '{role}',
    to_jsonb(COALESCE(user_role, 'member'))
  );

  -- Add admin status if true
  IF is_admin IS TRUE THEN
    claims := jsonb_set(
      claims,
      '{app_metadata}',
      jsonb_build_object('admin', true)
    );
  END IF;

  -- Update the claims in the event
  event := jsonb_set(event, '{claims}', claims);

  -- Log the final event
  RAISE NOTICE 'Returning modified event: %', event;

  RETURN event;
EXCEPTION WHEN OTHERS THEN
  -- Log any errors
  RAISE WARNING 'Error in custom_access_token_hook: % %', SQLERRM, SQLSTATE;
  -- Return original event if there's an error
  RETURN event;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO service_role;

-- Ensure profiles table exists and has correct permissions
DO $$
BEGIN
  -- Grant access to profiles table
  GRANT SELECT ON profiles TO authenticated;
  GRANT SELECT ON profiles TO service_role;
  
  -- Grant access to user_roles table
  GRANT SELECT ON user_roles TO authenticated;
  GRANT SELECT ON user_roles TO service_role;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error granting permissions: %', SQLERRM;
END $$;

-- Verify function exists
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'custom_access_token_hook'
  ), 'Function custom_access_token_hook does not exist';
END $$;