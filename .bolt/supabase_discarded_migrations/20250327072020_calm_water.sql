/*
  # Add RLS Policies to Payouts Table
  
  1. Purpose
    - Enable RLS on payouts table
    - Add policies for provider access
    
  2. Changes
    - Drop existing policies to avoid conflicts
    - Create new RLS policy for viewing payouts
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "payouts_select_own" ON payouts;
    DROP POLICY IF EXISTS "payouts_insert_own" ON payouts;
    DROP POLICY IF EXISTS "Providers can view their payouts" ON payouts;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing payouts
CREATE POLICY "Providers can view their payouts"
  ON payouts
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM partners p
    WHERE p.id = payouts.provider_id
    AND p.email = auth.email()
  ));