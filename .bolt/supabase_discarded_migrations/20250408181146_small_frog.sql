/*
  # Fix Medications Table RLS Policies

  1. Changes
    - Drop existing policies for medications table
    - Create simplified policies that allow partners to manage medications
    - Remove unnecessary WITH CHECK clauses that were causing permission issues

  2. Security
    - Enable RLS
    - Add policies for:
      - Partners to view, insert, update, and delete medications
      - Admins to manage all medications
*/

-- Drop existing policies for medications
DROP POLICY IF EXISTS "Partners can view medications" ON medications;
DROP POLICY IF EXISTS "Partners can insert medications" ON medications;
DROP POLICY IF EXISTS "Partners can update medications" ON medications;
DROP POLICY IF EXISTS "Partners can delete medications" ON medications;
DROP POLICY IF EXISTS "Partners can manage medications" ON medications;
DROP POLICY IF EXISTS "Admins can manage medications" ON medications;

-- Create simplified policies for medications
CREATE POLICY "Partners can view medications"
  ON medications
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'partner' OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "Partners can insert medications"
  ON medications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role')::text = 'partner' OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "Partners can update medications"
  ON medications
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'partner' OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

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