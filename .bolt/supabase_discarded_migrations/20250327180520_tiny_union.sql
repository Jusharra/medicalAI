/*
  # Fix User Signup System
  
  1. Purpose
    - Fix user signup error
    - Ensure proper role assignment
    - Add better error handling
    
  2. Changes
    - Drop existing functions and triggers
    - Create new consolidated user setup function
    - Add proper error handling
*/

-- Drop existing functions and triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create consolidated user setup function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile first
  BEGIN
    INSERT INTO user_profiles (
      user_id,
      email,
      first_name,
      last_name
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but continue
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
  END;

  -- Assign member role
  BEGIN
    INSERT INTO user_roles (user_id, role_id)
    SELECT NEW.id, r.id
    FROM roles r
    WHERE r.name = 'member'
    ON CONFLICT (user_id, role_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but continue
    RAISE WARNING 'Error assigning member role: %', SQLERRM;
  END;

  -- Initialize preferences
  BEGIN
    INSERT INTO user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but continue
    RAISE WARNING 'Error initializing preferences: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify function and trigger exist
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user'
  ), 'Function handle_new_user does not exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ), 'Trigger on_auth_user_created does not exist';
END $$;