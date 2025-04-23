/*
  # Fix User Signup Error
  
  1. Purpose
    - Fix the "Database error saving new user" issue
    - Update trigger function to handle errors gracefully
    - Ensure proper user profile creation
    
  2. Changes
    - Drop existing trigger and function
    - Create improved version with better error handling
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.store_role_in_users();

-- Create improved function for user creation
CREATE OR REPLACE FUNCTION public.store_role_in_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into user_profiles first
  INSERT INTO public.user_profiles (
    user_id,
    email,
    first_name,
    last_name
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  ) ON CONFLICT (user_id) DO NOTHING;

  -- Insert default role
  INSERT INTO public.user_roles (
    user_id,
    role_id
  )
  SELECT 
    NEW.id,
    r.id
  FROM public.roles r
  WHERE r.name = 'member'
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.store_role_in_users();

-- Verify function exists
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'store_role_in_users'
  ), 'Function store_role_in_users does not exist';
END $$;

-- Verify trigger exists
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ), 'Trigger on_auth_user_created does not exist';
END $$;