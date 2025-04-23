/*
  # Add Memberships Table
  
  1. Purpose
    - Store membership information
    - Track subscription status
    - Handle payment processing
    
  2. Security
    - Enable RLS
    - Add policies for user access
*/

-- Create memberships table
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type text NOT NULL CHECK (plan_type IN ('Essential Care', 'Premium Care', 'Elite Care')),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_payment_method_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'succeeded', 'failed')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  total_amount numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own membership"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can update own membership"
  ON memberships
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_memberships_profile_id ON memberships(profile_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_payment_status ON memberships(payment_status);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION handle_memberships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION handle_memberships_updated_at();