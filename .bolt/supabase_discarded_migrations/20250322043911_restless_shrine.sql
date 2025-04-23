-- First, disable RLS temporarily to allow cleanup
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Clean up all existing data
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.sessions;
DELETE FROM auth.users;
DELETE FROM users;

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Ensure policies exist
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "users_insert_self" ON users;
  DROP POLICY IF EXISTS "users_read_self" ON users;
  
  -- Recreate policies
  CREATE POLICY "users_insert_self"
    ON users
    FOR INSERT
    TO public
    WITH CHECK (auth.uid() = id);

  CREATE POLICY "users_read_self"
    ON users
    FOR SELECT
    TO public
    USING (auth.uid() = id);
END $$;

-- Ensure trigger exists
CREATE OR REPLACE FUNCTION store_role_in_users()
RETURNS trigger AS $$
BEGIN
  -- Only proceed if this is a new user
  IF TG_OP = 'INSERT' THEN
    -- Insert with error handling
    BEGIN
      INSERT INTO users (id, full_name, email, role)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email,
        'member'
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION store_role_in_users();