/*
  # Clean Up Payment System Tables
  
  1. Purpose
    - Remove duplicate table definitions
    - Ensure consistent schema
    - Maintain all required functionality
    
  2. Changes
    - Drop existing duplicate tables
    - Create clean versions with proper constraints
    - Add all necessary indexes and policies
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS payouts CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  stripe_subscription_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'trialing', 'canceled', 'incomplete')) DEFAULT 'active',
  amount numeric NOT NULL,
  currency text DEFAULT 'usd',
  interval text CHECK (interval IN ('month', 'year')),
  started_at timestamptz DEFAULT now(),
  canceled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Create policies for subscriptions
CREATE POLICY "subscriptions_select_own"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "subscriptions_insert_own"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "subscriptions_update_own"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create policies for payments
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

-- Create policies for payouts
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

-- Create indexes for subscriptions
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_provider ON subscriptions(provider_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- Create indexes for payments
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_provider ON payments(provider_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_type ON payments(type);
CREATE INDEX idx_payments_stripe ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_created ON payments(created_at);

-- Create indexes for payouts
CREATE INDEX idx_payouts_provider ON payouts(provider_id);
CREATE INDEX idx_payouts_payment ON payouts(payment_id);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_payouts_stripe ON payouts(stripe_transfer_id);
CREATE INDEX idx_payouts_created ON payouts(created_at);

-- Create triggers for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();