-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.store_role_in_users();

-- Create improved function for user creation with better error handling and logging
CREATE OR REPLACE FUNCTION public.store_role_in_users()
RETURNS trigger AS $$
DECLARE
  _email text;
  _role text;
  _user_exists boolean;
BEGIN
  -- Log the start of function execution
  RAISE NOTICE 'store_role_in_users triggered for user ID: %', NEW.id;

  -- Get email from new user
  _email := NEW.email;
  
  -- Get role from metadata or default to 'member'
  _role := COALESCE(NEW.raw_user_meta_data->>'role', 'member');

  -- Check if user already exists
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = NEW.id
  ) INTO _user_exists;

  -- Log the current state
  RAISE NOTICE 'User exists: %, Email: %, Role: %', _user_exists, _email, _role;

  -- Only proceed if user doesn't exist
  IF NOT _user_exists THEN
    -- Insert with error handling
    BEGIN
      INSERT INTO users (
        id,
        email,
        role
      ) VALUES (
        NEW.id,
        _email,
        _role
      );
      
      RAISE NOTICE 'Successfully created user record for ID: %', NEW.id;
    EXCEPTION 
      WHEN unique_violation THEN
        RAISE NOTICE 'Unique violation for user ID: % - user already exists', NEW.id;
      WHEN OTHERS THEN
        RAISE NOTICE 'Error creating user record: % %', SQLERRM, SQLSTATE;
        RETURN NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.store_role_in_users();

-- Verify function and trigger exist
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'store_role_in_users'
  ), 'Function store_role_in_users does not exist';

  ASSERT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ), 'Trigger on_auth_user_created does not exist';
END $$;

-- Fix any existing users without records
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  FOR auth_user IN 
    SELECT id, email 
    FROM auth.users 
    WHERE NOT EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.users.id
    )
  LOOP
    BEGIN
      INSERT INTO users (id, email, role)
      VALUES (auth_user.id, auth_user.email, 'member')
      ON CONFLICT (id) DO NOTHING;
      
      RAISE NOTICE 'Created missing user record for ID: %', auth_user.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error creating user record for ID %: % %', 
        auth_user.id, SQLERRM, SQLSTATE;
    END;
  END LOOP;
END $$;