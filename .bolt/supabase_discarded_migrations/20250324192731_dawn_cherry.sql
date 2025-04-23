-- Drop existing function to recreate with proper error handling
DROP FUNCTION IF EXISTS store_role_in_users() CASCADE;

-- Recreate function with better error handling and logging
CREATE OR REPLACE FUNCTION store_role_in_users()
RETURNS trigger AS $$
DECLARE
  role_value text;
BEGIN
  -- Get role from metadata or default to 'member'
  role_value := COALESCE(NEW.raw_user_meta_data->>'role', 'member');

  -- Insert or update user record
  BEGIN
    INSERT INTO public.users (id, full_name, email, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.email,
      role_value
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      role = EXCLUDED.role;

  EXCEPTION WHEN others THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Error in store_role_in_users: %', SQLERRM;
  END;

  -- Update user metadata
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'role', role_value,
    'full_name', COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION store_role_in_users();

-- Ensure proper schema permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;

-- Grant necessary table permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO postgres, anon, authenticated, service_role;

-- Grant sequence permissions
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
DROP POLICY IF EXISTS "users_read_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;

CREATE POLICY "users_read_policy"
  ON public.users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "users_insert_policy"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Set search path
ALTER ROLE postgres SET search_path = "$user", auth, public;
ALTER ROLE anon SET search_path = "$user", auth, public;
ALTER ROLE authenticated SET search_path = "$user", auth, public;
ALTER ROLE service_role SET search_path = "$user", auth, public;

-- Set current search path
SET search_path = "$user", auth, public;

-- Ensure email confirmations are properly handled
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;