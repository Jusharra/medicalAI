/*
  # Create Payments Table
  
  1. Purpose
    - Store payment information for subscriptions and one-time payments
    - Track payment status and history
    - Link payments to users and providers
    
  2. Security
    - Enable RLS
    - Add policies for access control
*/

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  stripe_payment_intent_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('subscription', 'one_time')),
  amount numeric NOT NULL,
  currency text DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'failed', 'pending')),
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "payments_select_own"
  ON payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "payments_insert_own"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_provider ON payments(provider_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_type ON payments(type);
CREATE INDEX idx_payments_stripe ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_created ON payments(created_at);

-- Create trigger for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();