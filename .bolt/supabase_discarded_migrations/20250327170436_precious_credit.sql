/*
  # Add Profile Access Policies
  
  1. Purpose
    - Add separate policies for viewing and updating profiles
    - Ensure proper access control for profile data
    
  2. Changes
    - Create distinct SELECT and UPDATE policies
    - Maintain same access control logic
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create separate policies for SELECT and UPDATE
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);