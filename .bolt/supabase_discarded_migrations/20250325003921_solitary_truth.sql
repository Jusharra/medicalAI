/*
  # Add Promotions Schema
  
  1. New Tables
    - promotions
      - Store promotional offers, surveys, and research studies
      - Track status, rewards, and expiration
      - Link to partners and members
    
    - promotion_claims
      - Track which members have claimed promotions
      - Store claim status and reward details
    
  2. Security
    - Enable RLS
    - Add policies for member access
*/

-- Create promotions table
CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  type text NOT NULL CHECK (type IN ('offer', 'survey', 'study')),
  reward_amount numeric NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  partner_name text NOT NULL,
  partner_logo text,
  terms_conditions text,
  max_claims integer,
  current_claims integer DEFAULT 0,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create promotion_claims table
CREATE TABLE IF NOT EXISTS promotion_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid REFERENCES promotions(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  claimed_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  reward_issued boolean DEFAULT false,
  reward_issued_at timestamptz,
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(promotion_id, profile_id)
);

-- Enable RLS
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_claims ENABLE ROW LEVEL SECURITY;

-- Create policies for promotions
CREATE POLICY "Anyone can view active promotions"
  ON promotions
  FOR SELECT
  TO authenticated
  USING (status = 'active' AND (expires_at > now() OR expires_at IS NULL));

-- Create policies for promotion claims
CREATE POLICY "Members can view own claims"
  ON promotion_claims
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Members can create claims"
  ON promotion_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM promotions p
      WHERE p.id = promotion_id
      AND p.status = 'active'
      AND (p.expires_at > now() OR p.expires_at IS NULL)
      AND (p.max_claims IS NULL OR p.current_claims < p.max_claims)
    )
  );

-- Create indexes
CREATE INDEX idx_promotions_status ON promotions(status);
CREATE INDEX idx_promotions_type ON promotions(type);
CREATE INDEX idx_promotions_expires_at ON promotions(expires_at);
CREATE INDEX idx_promotion_claims_profile_id ON promotion_claims(profile_id);
CREATE INDEX idx_promotion_claims_promotion_id ON promotion_claims(promotion_id);
CREATE INDEX idx_promotion_claims_status ON promotion_claims(status);

-- Create function to update promotion claim counts
CREATE OR REPLACE FUNCTION update_promotion_claims_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE promotions
    SET current_claims = current_claims + 1
    WHERE id = NEW.promotion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE promotions
    SET current_claims = current_claims - 1
    WHERE id = OLD.promotion_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for claim count updates
CREATE TRIGGER update_promotion_claims_count
  AFTER INSERT OR DELETE ON promotion_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_promotion_claims_count();

-- Create function to handle promotion expiration
CREATE OR REPLACE FUNCTION handle_promotion_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at < now() AND NEW.status = 'active' THEN
    NEW.status := 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for promotion expiration
CREATE TRIGGER handle_promotion_expiration
  BEFORE INSERT OR UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION handle_promotion_expiration();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotion_claims_updated_at
  BEFORE UPDATE ON promotion_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample promotions
INSERT INTO promotions (
  title,
  description,
  type,
  reward_amount,
  expires_at,
  partner_name,
  partner_logo,
  terms_conditions
) VALUES
(
  '25% Off Annual Health Screening',
  'Get a comprehensive health screening at any of our partner facilities.',
  'offer',
  250,
  '2025-04-30T00:00:00Z',
  'HealthFirst Labs',
  'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=100&h=100&q=80',
  'Valid for new patients only. Cannot be combined with other offers.'
),
(
  'Sleep Study Participation',
  'Participate in our sleep pattern research study and earn rewards.',
  'study',
  500,
  '2025-05-15T00:00:00Z',
  'SleepWell Research Institute',
  'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=100&h=100&q=80',
  NULL
),
(
  'Wellness Survey',
  'Share your wellness journey and help us improve our services.',
  'survey',
  50,
  '2025-04-20T00:00:00Z',
  'Vitalé Health',
  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=100&h=100&q=80',
  NULL
),
(
  'Mental Health Study',
  'Participate in our research on stress management techniques.',
  'study',
  300,
  '2025-05-30T00:00:00Z',
  'MindCare Research',
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=100&h=100&q=80',
  NULL
),
(
  'Free Nutrition Consultation',
  'One-on-one session with a certified nutritionist.',
  'offer',
  150,
  '2025-04-25T00:00:00Z',
  'NutriLife Wellness',
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=100&h=100&q=80',
  NULL
);