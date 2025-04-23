-- Drop existing policies for medications
DROP POLICY IF EXISTS "Partners can view medications" ON medications;
DROP POLICY IF EXISTS "Partners can manage medications" ON medications;
DROP POLICY IF EXISTS "Admins can manage medications" ON medications;

-- Create policies for medications
-- Allow partners to view medications
CREATE POLICY "Partners can view medications"
  ON medications
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'partner' OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Allow partners to insert medications
CREATE POLICY "Partners can insert medications"
  ON medications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role')::text = 'partner' OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Allow partners to update medications
CREATE POLICY "Partners can update medications"
  ON medications
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'partner' OR
    (auth.jwt() ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'role')::text = 'partner' OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Allow partners to delete medications
CREATE POLICY "Partners can delete medications"
  ON medications
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'partner' OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Ensure indexes exist for better query performance
CREATE INDEX IF NOT EXISTS idx_medications_name ON medications(name);
CREATE INDEX IF NOT EXISTS idx_medications_is_controlled ON medications(is_controlled);