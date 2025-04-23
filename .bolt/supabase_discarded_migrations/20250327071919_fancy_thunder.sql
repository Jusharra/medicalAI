/*
  # Add RLS Policies to Payments Table
  
  1. Purpose
    - Enable RLS on payments table
    - Add policies for authenticated users
    
  2. Changes
    - Drop existing policies to avoid conflicts
    - Create new RLS policy for viewing payments
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "payments_select_own" ON payments;
    DROP POLICY IF EXISTS "payments_insert_own" ON payments;
    DROP POLICY IF EXISTS "Authenticated users can view their payments" ON payments;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing payments
CREATE POLICY "Authenticated users can view their payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);