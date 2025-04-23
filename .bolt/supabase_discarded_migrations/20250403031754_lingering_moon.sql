-- Create reward_points table to track member points
CREATE TABLE IF NOT EXISTS reward_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  current_balance integer DEFAULT 0,
  lifetime_earned integer DEFAULT 0,
  lifetime_redeemed integer DEFAULT 0,
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id)
);

-- Create reward_transactions table to track point history
CREATE TABLE IF NOT EXISTS reward_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'expire', 'bonus', 'adjustment')),
  source text NOT NULL,
  description text,
  reference_id uuid,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create reward_tiers table to define membership tiers
CREATE TABLE IF NOT EXISTS reward_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  min_points integer NOT NULL,
  max_points integer,
  benefits jsonb,
  multiplier numeric DEFAULT 1.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reward_redemptions table to track redemptions
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id uuid REFERENCES member_rewards(id) ON DELETE SET NULL,
  points_used integer NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  redeemed_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text
);

-- Enable RLS
ALTER TABLE reward_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Create policies for reward_points
CREATE POLICY "Members can view their own reward points"
  ON reward_points
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Admins have full access to reward points"
  ON reward_points
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'admin');

-- Create policies for reward_transactions
CREATE POLICY "Members can view their own reward transactions"
  ON reward_transactions
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Admins have full access to reward transactions"
  ON reward_transactions
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'admin');

-- Create policies for reward_tiers
CREATE POLICY "Anyone can view reward tiers"
  ON reward_tiers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins have full access to reward tiers"
  ON reward_tiers
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'admin');

-- Create policies for reward_redemptions
CREATE POLICY "Members can view their own reward redemptions"
  ON reward_redemptions
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Members can create their own reward redemptions"
  ON reward_redemptions
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admins have full access to reward redemptions"
  ON reward_redemptions
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role')::text = 'admin');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to update updated_at for reward_points
CREATE TRIGGER update_reward_points_updated_at
  BEFORE UPDATE ON reward_points
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update updated_at for reward_tiers
CREATE TRIGGER update_reward_tiers_updated_at
  BEFORE UPDATE ON reward_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to update reward points balance
CREATE OR REPLACE FUNCTION update_reward_points_balance()
RETURNS TRIGGER AS $$
DECLARE
  point_balance integer;
  earned integer;
  redeemed integer;
BEGIN
  -- Calculate new balances
  IF NEW.transaction_type = 'earn' OR NEW.transaction_type = 'bonus' OR NEW.transaction_type = 'adjustment' THEN
    -- For positive adjustments
    IF NEW.points > 0 THEN
      SELECT 
        COALESCE(rp.current_balance, 0) + NEW.points,
        COALESCE(rp.lifetime_earned, 0) + NEW.points,
        COALESCE(rp.lifetime_redeemed, 0)
      INTO point_balance, earned, redeemed
      FROM reward_points rp
      WHERE rp.profile_id = NEW.profile_id;
    ELSE
      -- For negative adjustments
      SELECT 
        COALESCE(rp.current_balance, 0) + NEW.points,
        COALESCE(rp.lifetime_earned, 0),
        COALESCE(rp.lifetime_redeemed, 0)
      INTO point_balance, earned, redeemed
      FROM reward_points rp
      WHERE rp.profile_id = NEW.profile_id;
    END IF;
  ELSIF NEW.transaction_type = 'redeem' OR NEW.transaction_type = 'expire' THEN
    SELECT 
      COALESCE(rp.current_balance, 0) - ABS(NEW.points),
      COALESCE(rp.lifetime_earned, 0),
      COALESCE(rp.lifetime_redeemed, 0) + ABS(NEW.points)
    INTO point_balance, earned, redeemed
    FROM reward_points rp
    WHERE rp.profile_id = NEW.profile_id;
  END IF;
  
  -- Ensure balance doesn't go negative
  IF point_balance < 0 THEN
    point_balance := 0;
  END IF;
  
  -- Update or insert reward_points record
  INSERT INTO reward_points (
    profile_id,
    current_balance,
    lifetime_earned,
    lifetime_redeemed,
    last_activity
  ) VALUES (
    NEW.profile_id,
    point_balance,
    earned,
    redeemed,
    now()
  )
  ON CONFLICT (profile_id) DO UPDATE SET
    current_balance = point_balance,
    lifetime_earned = earned,
    lifetime_redeemed = redeemed,
    last_activity = now(),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for reward transactions
CREATE TRIGGER update_reward_points_balance_trigger
  AFTER INSERT ON reward_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_reward_points_balance();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reward_points_profile_id ON reward_points(profile_id);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_profile_id ON reward_transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_created_at ON reward_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_reward_transactions_transaction_type ON reward_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_profile_id ON reward_redemptions(profile_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id ON reward_redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON reward_redemptions(status);

-- Insert sample reward tiers
INSERT INTO reward_tiers (name, min_points, max_points, benefits, multiplier)
VALUES
  (
    'Bronze',
    0,
    999,
    '{"perks": ["Basic rewards access", "Standard earning rate", "Monthly newsletter"], "bonus_categories": ["wellness"]}',
    1.0
  ),
  (
    'Silver',
    1000,
    4999,
    '{"perks": ["Priority booking", "10% bonus on earned points", "Quarterly health assessment"], "bonus_categories": ["wellness", "medical"]}',
    1.1
  ),
  (
    'Gold',
    5000,
    9999,
    '{"perks": ["VIP booking", "25% bonus on earned points", "Dedicated health concierge", "Quarterly wellness credit"], "bonus_categories": ["wellness", "medical", "travel"]}',
    1.25
  ),
  (
    'Platinum',
    10000,
    NULL,
    '{"perks": ["Elite booking", "50% bonus on earned points", "Personal health advisor", "Priority access to specialists", "Annual wellness retreat"], "bonus_categories": ["wellness", "medical", "travel", "luxury"]}',
    1.5
  );

-- Insert sample reward points for existing users
INSERT INTO reward_points (
  profile_id,
  current_balance,
  lifetime_earned,
  lifetime_redeemed,
  last_activity
)
SELECT
  id as profile_id,
  floor(random() * 5000)::integer as current_balance,
  floor(random() * 10000)::integer as lifetime_earned,
  floor(random() * 2000)::integer as lifetime_redeemed,
  now() - (random() * interval '90 days') as last_activity
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM reward_points WHERE reward_points.profile_id = auth.users.id
)
LIMIT 50;

-- Insert sample reward transactions
INSERT INTO reward_transactions (
  profile_id,
  points,
  transaction_type,
  source,
  description,
  created_at
)
SELECT
  rp.profile_id,
  CASE transaction_type
    WHEN 'earn' THEN floor(random() * 500 + 100)::integer
    WHEN 'bonus' THEN floor(random() * 200 + 50)::integer
    WHEN 'redeem' THEN -1 * floor(random() * 300 + 100)::integer
    WHEN 'expire' THEN -1 * floor(random() * 100 + 50)::integer
    ELSE floor(random() * 100)::integer
  END as points,
  transaction_type,
  source,
  CASE transaction_type
    WHEN 'earn' THEN 'Points earned for ' || source
    WHEN 'bonus' THEN 'Bonus points for ' || source
    WHEN 'redeem' THEN 'Points redeemed for ' || source
    WHEN 'expire' THEN 'Points expired from ' || source
    ELSE 'Point adjustment for ' || source
  END as description,
  rp.last_activity - (random() * interval '30 days') as created_at
FROM reward_points rp
CROSS JOIN (
  VALUES 
    ('earn', 'appointment'),
    ('earn', 'purchase'),
    ('earn', 'referral'),
    ('bonus', 'promotion'),
    ('bonus', 'loyalty'),
    ('redeem', 'service'),
    ('redeem', 'product'),
    ('expire', 'annual expiry'),
    ('adjustment', 'customer service')
) as t(transaction_type, source)
WHERE random() < 0.3 -- 30% chance of creating a transaction for each combination
ORDER BY random()
LIMIT 200;

-- Insert sample reward redemptions
INSERT INTO reward_redemptions (
  profile_id,
  reward_id,
  points_used,
  status,
  redeemed_at,
  processed_at,
  notes
)
SELECT
  mr.profile_id,
  mr.id as reward_id,
  floor(random() * 500 + 100)::integer as points_used,
  CASE floor(random() * 4)
    WHEN 0 THEN 'pending'
    WHEN 1 THEN 'approved'
    WHEN 2 THEN 'completed'
    ELSE 'rejected'
  END as status,
  mr.created_at + (random() * interval '30 days') as redeemed_at,
  CASE 
    WHEN random() < 0.7 THEN mr.created_at + (random() * interval '35 days')
    ELSE NULL
  END as processed_at,
  CASE floor(random() * 3)
    WHEN 0 THEN 'Standard redemption'
    WHEN 1 THEN 'Special request approved'
    ELSE 'Member requested expedited processing'
  END as notes
FROM member_rewards mr
WHERE mr.status = 'used'
AND random() < 0.5 -- 50% chance of creating a redemption
LIMIT 50;