/*
  # Fix Medications RLS Policies

  1. Changes
    - Drop existing RLS policies for medications table
    - Create new comprehensive RLS policies for medications
    
  2. Security
    - Enable RLS on medications table
    - Add policies for:
      - Partners can manage medications
      - Admins retain full access
      - Proper role-based access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Partners can delete medications" ON medications;
DROP POLICY IF EXISTS "Partners can insert medications" ON medications;
DROP POLICY IF EXISTS "Partners can update medications" ON medications;
DROP POLICY IF EXISTS "Partners can view medications" ON medications;

-- Create new comprehensive policies
CREATE POLICY "Partners can manage medications"
ON public.medications
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  ((auth.jwt() ->> 'role'::text) = 'partner'::text) OR 
  ((auth.jwt() ->> 'role'::text) = 'admin'::text)
)
WITH CHECK (
  ((auth.jwt() ->> 'role'::text) = 'partner'::text) OR 
  ((auth.jwt() ->> 'role'::text) = 'admin'::text)
);