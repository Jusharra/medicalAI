-- Grant necessary permissions for auth.identities
GRANT SELECT ON auth.identities TO anon;
GRANT SELECT ON auth.identities TO authenticated;

-- Ensure users table has proper permissions
GRANT SELECT ON users TO anon;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

-- Ensure auth.users has proper permissions
GRANT SELECT ON auth.users TO anon;
GRANT SELECT ON auth.users TO authenticated;

-- Add policy for public access to auth.users
CREATE POLICY "Allow public read access" ON auth.users
  FOR SELECT
  TO public
  USING (true);

-- Add policy for public access to auth.identities
CREATE POLICY "Allow public read access" ON auth.identities
  FOR SELECT
  TO public
  USING (true);