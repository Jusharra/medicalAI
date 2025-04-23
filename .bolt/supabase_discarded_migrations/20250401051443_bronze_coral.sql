-- Drop existing trigger and function first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.store_role_in_users();

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT users_email_key UNIQUE (email)
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "users_insert_self" ON users;
    DROP POLICY IF EXISTS "users_read_self" ON users;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create policies
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

-- Create function to store user role
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
      -- If email already exists, just ignore
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION store_role_in_users();

-- Create index for role lookup
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

-- Fix any existing users without records
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  FOR auth_user IN 
    SELECT id, email, raw_user_meta_data->>'full_name' as full_name
    FROM auth.users 
    WHERE NOT EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.users.id
    )
  LOOP
    BEGIN
      INSERT INTO users (id, full_name, email, role)
      VALUES (
        auth_user.id, 
        COALESCE(auth_user.full_name, ''),
        auth_user.email,
        'member'
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error creating user record for ID %: % %', 
        auth_user.id, SQLERRM, SQLSTATE;
    END;
  END LOOP;
END $$;