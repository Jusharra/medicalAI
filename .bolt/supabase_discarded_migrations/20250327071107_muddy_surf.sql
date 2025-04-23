/*
  # Create Payouts Table
  
  1. Purpose
    - Store payout information for providers
    - Track payment transfers and status
    - Link to payments and providers
    
  2. Security
    - Enable RLS
    - Add policies for provider access
*/

-- Create payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id) ON DELETE CASCADE,
  stripe_transfer_id text,
  amount numeric NOT NULL,
  currency text DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  initiated_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "payouts_select_own"
  ON payouts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partners
      WHERE id = payouts.provider_id
      AND email = auth.email()
    )
  );

CREATE POLICY "payouts_insert_own"
  ON payouts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM partners
      WHERE id = provider_id
      AND email = auth.email()
    )
  );

-- Create indexes
CREATE INDEX idx_payouts_provider ON payouts(provider_id);
CREATE INDEX idx_payouts_payment ON payouts(payment_id);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_stripe ON payouts(stripe_transfer_id);
CREATE INDEX idx_payouts_created ON payouts(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();