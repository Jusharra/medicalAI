-- Drop existing tables and policies
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow inserting own data" ON users;
    DROP POLICY IF EXISTS "Allow users to see own data" ON users;
EXCEPTION
    WHEN undefined_table THEN 
        NULL;
END $$;

-- Drop existing table if it exists
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT users_email_key UNIQUE (email)
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

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

-- Create role index
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

-- Create function to store user role
CREATE OR REPLACE FUNCTION store_role_in_users()
RETURNS trigger AS $$
BEGIN
  -- Only proceed if this is a new user
  IF TG_OP = 'INSERT' THEN
    -- Insert with error handling
    BEGIN
      INSERT INTO users (id, email, role)
      VALUES (
        NEW.id,
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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION store_role_in_users();