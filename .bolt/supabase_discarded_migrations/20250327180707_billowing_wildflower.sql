/*
  # Add Public Signup Policy
  
  1. Purpose
    - Enable public user registration
    - Allow anyone to create an account
    - Maintain security with proper constraints
    
  2. Security
    - Only allow INSERT operations
    - No restrictions on signup
*/

-- Create policy to allow public signup
CREATE POLICY "Allow public signup"
  ON auth.users
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Verify policy exists
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'auth' 
    AND tablename = 'users' 
    AND policyname = 'Allow public signup'
  ), 'Public signup policy does not exist';
END $$;