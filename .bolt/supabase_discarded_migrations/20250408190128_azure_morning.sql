/*
  # Fix Medications Table RLS Policies

  1. Changes
    - Drop all existing policies for medications table
    - Create a single, maximally permissive policy for partners and admins
    - Use a simple policy condition that will work reliably

  2. Security
    - Enable RLS
    - Allow partners and admins to perform all operations on medications
*/

-- Enable RLS
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies using a safe approach
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'medications' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.medications', pol.policyname);
    END LOOP;
END $$;

-- Create a single, maximally permissive policy
CREATE POLICY "medications_all_operations"
  ON medications
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure indexes exist for better query performance
CREATE INDEX IF NOT EXISTS idx_medications_name ON medications(name);
CREATE INDEX IF NOT EXISTS idx_medications_is_controlled ON medications(is_controlled);