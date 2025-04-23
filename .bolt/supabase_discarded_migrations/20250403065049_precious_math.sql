/*
  # Fix Transactions Table RLS Policies

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create new policies with proper permissions
    - Add policy for admin inserts without partner_id requirement

  2. Security
    - Enable RLS
    - Add policies for:
      - SELECT: Partners can view their own transactions, admins can view all
      - INSERT: Admins can insert transactions without partner_id
      - UPDATE/DELETE: Admins can manage all transactions
*/

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Partners can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can manage all transactions" ON transactions;

-- Create policies
CREATE POLICY "Partners can view their own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (
    partner_id = auth.uid() OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Allow admins to insert transactions without requiring partner_id
CREATE POLICY "Admins can insert transactions"
  ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Allow admins to update transactions
CREATE POLICY "Admins can update transactions"
  ON transactions
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Allow admins to delete transactions
CREATE POLICY "Admins can delete transactions"
  ON transactions
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Make partner_id optional for admin transactions
ALTER TABLE transactions ALTER COLUMN partner_id DROP NOT NULL;