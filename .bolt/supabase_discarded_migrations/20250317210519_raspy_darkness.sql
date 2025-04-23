/*
  # Add Platform Fee Tracking to Memberships

  1. Changes
    - Add columns to track platform fees and partner payments
    - Add columns for payment status and transfer details
    
  2. Security
    - Maintain existing RLS policies
    - Add policy for viewing total amounts
*/

-- Add fee tracking columns to memberships
ALTER TABLE memberships 
ADD COLUMN IF NOT EXISTS total_amount numeric NOT NULL,
ADD COLUMN IF NOT EXISTS platform_fee numeric NOT NULL,
ADD COLUMN IF NOT EXISTS partner_amount numeric NOT NULL,
ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES partners(id),
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS stripe_transfer_id text,
ADD COLUMN IF NOT EXISTS transfer_status text DEFAULT 'pending';

-- Add constraint to ensure amounts add up correctly
ALTER TABLE memberships
ADD CONSTRAINT membership_amounts_check 
CHECK (total_amount = platform_fee + partner_amount);

-- Add index for partner lookups
CREATE INDEX IF NOT EXISTS memberships_partner_id_idx ON memberships(partner_id);

-- Add policy for partners to view their memberships
CREATE POLICY "Partners can view assigned memberships"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partners p
      WHERE p.id = memberships.partner_id
      AND p.email = auth.email()
    )
  );