/*
  # Add RLS Policies for Purchases Table
  
  1. Purpose
    - Allow authenticated users to manage their purchases
    - Enable secure purchase creation and viewing
    
  2. Changes
    - Add INSERT policy for authenticated users
    - Update existing SELECT policy
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own purchases"
  ON purchases
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can create own purchases"
  ON purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_purchases_profile_id ON purchases(profile_id);
CREATE INDEX IF NOT EXISTS idx_purchases_service_id ON purchases(service_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON purchases(payment_status);