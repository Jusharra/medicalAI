/*
  # Fix Medications Table RLS Policies

  1. Changes
    - Update RLS policies for medications table
    - Allow partners to manage medications
    - Maintain admin access to all medications

  2. Security
    - Enable RLS
    - Add policies for:
      - Partners to manage medications
      - Admins to manage all medications
*/

-- Drop existing policies for medications
DROP POLICY IF EXISTS "Partners can view medications" ON medications;
DROP POLICY IF EXISTS "Admins can manage medications" ON medications;

-- Create new policies for medications
CREATE POLICY "Partners can manage medications"
  ON medications
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'partner'
  )
  WITH CHECK (
    (auth.jwt() ->> 'role')::text = 'partner'
  );

CREATE POLICY "Admins can manage medications"
  ON medications
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Ensure indexes exist for better query performance
CREATE INDEX IF NOT EXISTS idx_medications_name ON medications(name);
CREATE INDEX IF NOT EXISTS idx_medications_is_controlled ON medications(is_controlled);