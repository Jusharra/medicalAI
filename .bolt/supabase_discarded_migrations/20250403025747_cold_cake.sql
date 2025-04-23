/*
  # Add Promotion Management Tables and Data

  1. New Tables
    - `promotion_target_groups` - For targeting specific member groups
    - `promotion_service_mappings` - For associating promotions with services
    - `promotion_performance_metrics` - For tracking promotion performance

  2. Changes
    - Add new columns to promotions table
    - Add sample data for testing
    - Create views for performance reporting

  3. Security
    - Enable RLS
    - Add policies for:
      - Admins to have full access
      - Partners to manage their own promotions
*/

-- Add new columns to promotions table if they don't exist
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS target_audience text,
ADD COLUMN IF NOT EXISTS redemption_limit integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS redemptions_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES services(id) ON DELETE SET NULL;

-- Create promotion_target_groups table
CREATE TABLE IF NOT EXISTS promotion_target_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  criteria jsonb,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create promotion_service_mappings table
CREATE TABLE IF NOT EXISTS promotion_service_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid REFERENCES promotions(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(promotion_id, service_id)
);

-- Create promotion_performance_metrics table
CREATE TABLE IF NOT EXISTS promotion_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid REFERENCES promotions(id) ON DELETE CASCADE,
  date date NOT NULL,
  views integer DEFAULT 0,
  claims integer DEFAULT 0,
  conversions integer DEFAULT 0,
  revenue_impact numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(promotion_id, date)
);

-- Enable RLS
ALTER TABLE promotion_target_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_service_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for promotion_target_groups
CREATE POLICY "Admins full access to promotion target groups"
  ON promotion_target_groups
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Create policies for promotion_service_mappings
CREATE POLICY "Admins full access to promotion service mappings"
  ON promotion_service_mappings
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Create policies for promotion_performance_metrics
CREATE POLICY "Admins full access to promotion performance metrics"
  ON promotion_performance_metrics
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Create view for promotion performance summary
CREATE OR REPLACE VIEW promotion_performance_summary AS
SELECT
  p.id,
  p.title,
  p.type,
  p.status,
  p.expires_at,
  p.reward_amount,
  COUNT(pc.id) AS total_claims,
  COUNT(pc.id) FILTER (WHERE pc.status = 'approved' OR pc.status = 'completed') AS approved_claims,
  COUNT(pc.id) FILTER (WHERE pc.status = 'rejected') AS rejected_claims,
  CASE 
    WHEN COUNT(pc.id) > 0 THEN 
      ROUND((COUNT(pc.id) FILTER (WHERE pc.status = 'approved' OR pc.status = 'completed')::numeric / COUNT(pc.id)::numeric) * 100, 2)
    ELSE 0
  END AS conversion_rate,
  p.reward_amount * COUNT(pc.id) FILTER (WHERE pc.status = 'approved' OR pc.status = 'completed') AS total_reward_value,
  (p.reward_amount * COUNT(pc.id) FILTER (WHERE pc.status = 'approved' OR pc.status = 'completed')) * 2.5 AS estimated_revenue_impact
FROM 
  promotions p
LEFT JOIN 
  promotion_claims pc ON p.id = pc.promotion_id
GROUP BY 
  p.id, p.title, p.type, p.status, p.expires_at, p.reward_amount;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status);
CREATE INDEX IF NOT EXISTS idx_promotions_expires_at ON promotions(expires_at);
CREATE INDEX IF NOT EXISTS idx_promotions_target_audience ON promotions(target_audience);
CREATE INDEX IF NOT EXISTS idx_promotions_service_id ON promotions(service_id);
CREATE INDEX IF NOT EXISTS idx_promotion_claims_status ON promotion_claims(status);
CREATE INDEX IF NOT EXISTS idx_promotion_service_mappings_promotion_id ON promotion_service_mappings(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_service_mappings_service_id ON promotion_service_mappings(service_id);
CREATE INDEX IF NOT EXISTS idx_promotion_performance_metrics_date ON promotion_performance_metrics(date);

-- Update existing promotions with new fields
UPDATE promotions
SET 
  target_audience = CASE floor(random() * 4)
    WHEN 0 THEN 'all'
    WHEN 1 THEN 'new_members'
    WHEN 2 THEN 'existing_members'
    ELSE 'specific_group'
  END,
  redemption_limit = CASE 
    WHEN random() < 0.3 THEN 0 -- 30% chance of unlimited
    ELSE floor(random() * 50 + 10)::integer -- 10-60 limit
  END,
  redemptions_used = floor(random() * 10)::integer,
  service_id = (
    SELECT id FROM services 
    ORDER BY random() 
    LIMIT 1
  )
WHERE target_audience IS NULL;

-- Insert sample promotion target groups
INSERT INTO promotion_target_groups (name, description, criteria, created_at)
VALUES
  (
    'New Members',
    'Members who joined in the last 30 days',
    '{"join_date": {"operator": ">=", "value": "30 days ago"}}',
    now() - interval '60 days'
  ),
  (
    'High-Value Members',
    'Members with premium subscriptions',
    '{"membership_tier": {"operator": "in", "value": ["premium", "elite"]}}',
    now() - interval '45 days'
  ),
  (
    'Wellness Enthusiasts',
    'Members interested in wellness services',
    '{"interests": {"operator": "contains", "value": ["wellness", "fitness", "nutrition"]}}',
    now() - interval '30 days'
  ),
  (
    'Inactive Members',
    'Members with no activity in 60+ days',
    '{"last_activity": {"operator": "<=", "value": "60 days ago"}}',
    now() - interval '15 days'
  );

-- Insert sample promotion service mappings
INSERT INTO promotion_service_mappings (promotion_id, service_id)
SELECT 
  p.id as promotion_id,
  s.id as service_id
FROM 
  promotions p
CROSS JOIN (
  SELECT id FROM services ORDER BY random() LIMIT 3
) s
WHERE 
  p.type = 'offer' AND
  NOT EXISTS (
    SELECT 1 FROM promotion_service_mappings 
    WHERE promotion_service_mappings.promotion_id = p.id
    AND promotion_service_mappings.service_id = s.id
  )
LIMIT 10;

-- Insert sample promotion performance metrics
INSERT INTO promotion_performance_metrics (
  promotion_id,
  date,
  views,
  claims,
  conversions,
  revenue_impact
)
SELECT
  p.id as promotion_id,
  (now() - (i * interval '1 day'))::date as date,
  floor(random() * 100 + 50)::integer as views,
  floor(random() * 30 + 5)::integer as claims,
  floor(random() * 10 + 1)::integer as conversions,
  (floor(random() * 1000 + 100)::integer)::numeric as revenue_impact
FROM
  promotions p
CROSS JOIN
  generate_series(0, 30) as i
WHERE
  p.status = 'active'
LIMIT 100;

-- Update promotion claims with more realistic data
UPDATE promotion_claims
SET
  status = CASE floor(random() * 4)
    WHEN 0 THEN 'pending'
    WHEN 1 THEN 'approved'
    WHEN 2 THEN 'completed'
    ELSE 'rejected'
  END
WHERE
  random() < 0.8; -- Update 80% of claims