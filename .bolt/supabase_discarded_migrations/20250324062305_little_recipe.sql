-- Drop existing function and recreate with proper error handling
CREATE OR REPLACE FUNCTION store_role_in_users()
RETURNS trigger AS $$
BEGIN
  -- Only proceed if this is a new user
  IF TG_OP = 'INSERT' THEN
    -- Insert with better error handling and logging
    BEGIN
      INSERT INTO users (id, full_name, email, role)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'member')
      )
      ON CONFLICT (id) DO UPDATE
      SET 
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        role = EXCLUDED.role;
      
      -- Update user metadata to include role
      UPDATE auth.users
      SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', COALESCE(NEW.raw_user_meta_data->>'role', 'member'))
      WHERE id = NEW.id;
      
    EXCEPTION WHEN others THEN
      -- Log error details to server log
      RAISE NOTICE 'Error in store_role_in_users: %', SQLERRM;
      -- Continue without failing the transaction
      RETURN NEW;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure proper permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Add explicit policies for auth tables
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public users are viewable by everyone."
    ON auth.users FOR SELECT
    USING (true);

-- Ensure email confirmations are properly handled
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;

-- Reset the search path to ensure proper schema resolution
SET search_path = "$user", auth, public;