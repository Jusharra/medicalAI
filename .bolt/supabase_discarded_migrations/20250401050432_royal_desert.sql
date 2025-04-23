-- Drop existing tables and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.store_role_in_users();
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamp with time zone DEFAULT now(),
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

-- Create function to store user role
CREATE OR REPLACE FUNCTION store_role_in_users()
RETURNS trigger AS $$
BEGIN
  INSERT INTO users (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    'member'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION store_role_in_users();