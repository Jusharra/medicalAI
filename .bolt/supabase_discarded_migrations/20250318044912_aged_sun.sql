/*
  # Add profile insert policy
  
  1. Changes
    - Add RLS policy to allow users to insert their own profile data
    - Policy ensures users can only create a profile with their own user ID
*/

-- Create policy to allow users to insert their own profile
CREATE POLICY "Users can create own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);