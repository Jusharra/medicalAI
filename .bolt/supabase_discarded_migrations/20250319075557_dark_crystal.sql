/*
  # Add Partner Revenue Sharing Schema
  
  1. New Tables
    - partner_commissions
      - Track referral commissions
      - Store commission rates and thresholds
      - Handle revenue sharing calculations
    
    - partner_payouts
      - Track payment history to partners
      - Store payout status and details
    
  2. Security
    - Enable RLS
    - Add policies for partner access
*/

-- Create partner_commissions table
CREATE TABLE partner_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  membership_id uuid REFERENCES memberships(id) ON DELETE CASCADE,
  commission_rate numeric NOT NULL,
  commission_amount numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  referral_code text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create partner_payouts table
CREATE TABLE partner_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payout_method text NOT NULL,
  payout_details jsonb,
  reference_id text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add commission tracking to partners table
ALTER TABLE partners 
ADD COLUMN commission_rate numeric DEFAULT 20.0,
ADD COLUMN minimum_payout numeric DEFAULT 100.0,
ADD COLUMN total_earnings numeric DEFAULT 0.0,
ADD COLUMN pending_balance numeric DEFAULT 0.0;

-- Enable RLS
ALTER TABLE partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_payouts ENABLE ROW LEVEL SECURITY;

-- Create policies for partner_commissions
CREATE POLICY "Partners can view own commissions"
  ON partner_commissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partners p
      WHERE p.id = partner_commissions.partner_id
      AND p.email = auth.email()
    )
  );

-- Create policies for partner_payouts
CREATE POLICY "Partners can view own payouts"
  ON partner_payouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partners p
      WHERE p.id = partner_payouts.partner_id
      AND p.email = auth.email()
    )
  );

-- Create indexes
CREATE INDEX partner_commissions_partner_id_idx ON partner_commissions(partner_id);
CREATE INDEX partner_commissions_status_idx ON partner_commissions(status);
CREATE INDEX partner_payouts_partner_id_idx ON partner_payouts(partner_id);
CREATE INDEX partner_payouts_status_idx ON partner_payouts(status);

-- Create function to calculate partner commission
CREATE OR REPLACE FUNCTION calculate_partner_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate commission for new memberships with succeeded payments
  IF NEW.payment_status = 'succeeded' AND OLD.payment_status != 'succeeded' THEN
    -- Insert commission record if membership has partner
    IF NEW.partner_id IS NOT NULL THEN
      INSERT INTO partner_commissions (
        partner_id,
        membership_id,
        commission_rate,
        commission_amount,
        status
      )
      SELECT
        NEW.partner_id,
        NEW.id,
        p.commission_rate,
        (NEW.total_amount * (p.commission_rate / 100.0)),
        'pending'
      FROM partners p
      WHERE p.id = NEW.partner_id;
      
      -- Update partner pending balance
      UPDATE partners
      SET pending_balance = pending_balance + (NEW.total_amount * (commission_rate / 100.0))
      WHERE id = NEW.partner_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for commission calculation
CREATE TRIGGER calculate_commission_on_payment
  AFTER UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION calculate_partner_commission();