-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.store_role_in_users();

-- Create improved function for user creation with better error handling
CREATE OR REPLACE FUNCTION public.store_role_in_users()
RETURNS trigger AS $$
BEGIN
  -- Insert new user with error handling
  BEGIN
    INSERT INTO users (
      id,
      email,
      role
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'role', 'member')
    );
    
    RAISE NOTICE 'Successfully created user record for ID: %', NEW.id;
  EXCEPTION 
    WHEN unique_violation THEN
      RAISE NOTICE 'User already exists with ID: %', NEW.id;
      -- Update existing user
      UPDATE users 
      SET 
        email = NEW.email,
        role = COALESCE(NEW.raw_user_meta_data->>'role', 'member')
      WHERE id = NEW.id;
    WHEN OTHERS THEN
      RAISE WARNING 'Error in store_role_in_users: % %', SQLERRM, SQLSTATE;
      RETURN NULL;
  END;

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