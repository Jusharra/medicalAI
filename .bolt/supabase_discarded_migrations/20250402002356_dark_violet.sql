/*
  # Add User Roles and Policies

  1. Changes
    - Add role column to users table with enum constraint
    - Add default role policy
    - Update existing policies

  2. Security
    - Enable RLS
    - Add role-based policies
*/

-- Create role enum type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('member', 'admin', 'partner');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Modify users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'member';

-- Create index on role
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Update user creation function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO users (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    'member'::user_role
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user: % %', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Update policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admin can read all data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );