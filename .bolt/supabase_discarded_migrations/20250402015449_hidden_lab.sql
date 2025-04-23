/*
  # Fix User Table Permissions

  1. Changes
    - Add RLS policies for users table
    - Allow users to read their own data
    - Allow admins to read all data
    - Allow partners to read data of their assigned patients

  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Add policies for specific roles
*/

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- Create new policies
CREATE POLICY "users_read_access"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read their own data
    id = auth.uid() OR
    -- Partners can read data of their assigned patients
    EXISTS (
      SELECT 1 FROM care_team_members
      WHERE care_team_members.partner_id = auth.uid()
      AND care_team_members.profile_id = users.id
    ) OR
    -- Admins can read all data
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "users_update_own"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);