/*
  # Update Purchases Table Policies
  
  1. Purpose
    - Allow users to view and manage their purchases
    - Enable proper querying for past and upcoming bookings
    
  2. Changes
    - Add policies for viewing and creating purchases
    - Add indexes for efficient querying
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own purchases" ON purchases;
    DROP POLICY IF EXISTS "Users can create own purchases" ON purchases;
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

CREATE POLICY "Users can update own purchases"
  ON purchases
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_purchases_profile_id ON purchases(profile_id);
CREATE INDEX IF NOT EXISTS idx_purchases_service_id ON purchases(service_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_payment_status ON purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_purchases_appointment_date ON purchases(appointment_date);
CREATE INDEX IF NOT EXISTS idx_purchases_purchase_date ON purchases(purchase_date);