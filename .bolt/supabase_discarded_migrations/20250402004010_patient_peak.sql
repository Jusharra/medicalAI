/*
  # Fix Authentication Role Issues

  1. Changes
    - Drop and recreate role enum type
    - Update users table structure
    - Add proper RLS policies
    - Fix user creation trigger

  2. Security
    - Enable RLS
    - Add policies for role-based access
*/

-- Drop existing objects to ensure clean slate
DO $$ 
BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
    DROP TYPE IF EXISTS user_role CASCADE;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create role enum type
CREATE TYPE user_role AS ENUM ('member', 'admin', 'partner');

-- Recreate users table
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    role user_role NOT NULL DEFAULT 'member',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT users_email_key UNIQUE (email)
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create policies
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

CREATE POLICY "Admin can update all data"
    ON users
    FOR UPDATE
    TO authenticated
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    )
    WITH CHECK (
        (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );

-- Create function to handle new user creation
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
        CASE 
            WHEN NEW.email LIKE '%admin%' THEN 'admin'
            WHEN NEW.email LIKE '%partner%' THEN 'partner'
            ELSE 'member'
        END
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Add missing users for existing auth users
INSERT INTO users (id, email, role)
SELECT 
    id,
    email,
    CASE 
        WHEN email LIKE '%admin%' THEN 'admin'
        WHEN email LIKE '%partner%' THEN 'partner'
        ELSE 'member'
    END
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.users.id
)
ON CONFLICT (id) DO NOTHING;