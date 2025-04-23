/*
  # Add Profile Insert Policy
  
  1. Purpose
    - Allow authenticated users to create their own profile
    - Ensure profile ID matches user ID
    - Maintain data integrity
    
  2. Changes
    - Add INSERT policy for profiles table
    - Verify policy creation
*/

-- Drop existing insert policy if it exists
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow profile inserts for new users" ON profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create new insert policy
CREATE POLICY "Allow profile inserts for new users"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Verify policy exists
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Allow profile inserts for new users'
  ), 'Profile insert policy does not exist';
END $$;