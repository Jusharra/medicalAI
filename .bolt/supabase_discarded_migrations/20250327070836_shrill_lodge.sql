/*
  # Create Subscriptions Table
  
  1. Purpose
    - Store subscription information for providers
    - Track subscription status and payments
    - Link providers with users
    
  2. Security
    - Enable RLS
    - Add policies for access control
*/

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

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create indexes
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_provider ON subscriptions(provider_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- Create trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();