/*
  # Create Memberships Table
  
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
  platform_fee numeric,
  partner_amount numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own memberships" ON memberships;
DROP POLICY IF EXISTS "Users can update own memberships" ON memberships;

-- Create policies
CREATE POLICY "memberships_select_policy"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "memberships_update_policy"
  ON memberships
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_memberships_profile_id ON memberships(profile_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_payment_status ON memberships(payment_status);

-- Create test member with active membership
INSERT INTO memberships (
  profile_id,
  plan_type,
  status,
  payment_status,
  current_period_start,
  current_period_end,
  total_amount,
  platform_fee,
  partner_amount
) VALUES (
  'efbd2fb4-4a3b-4d6e-a553-eec02a567ba8',
  'Premium Care',
  'active',
  'succeeded',
  now(),
  now() + interval '1 month',
  499.00,
  99.80,
  399.20
) ON CONFLICT DO NOTHING;