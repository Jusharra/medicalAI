-- Drop existing tables if they exist
DROP TABLE IF EXISTS promotion_claims CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;

-- Create promotions table
CREATE TABLE promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL CHECK (type IN ('offer', 'survey', 'study')),
  reward_amount numeric NOT NULL,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  partner_id uuid REFERENCES partners(id) ON DELETE SET NULL,
  terms_conditions text,
  created_at timestamptz DEFAULT now()
);

-- Create promotion_claims table
CREATE TABLE promotion_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  promotion_id uuid REFERENCES promotions(id) ON DELETE CASCADE,
  claimed_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  UNIQUE(profile_id, promotion_id)
);

-- Enable RLS
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_claims ENABLE ROW LEVEL SECURITY;

-- Create policies for promotions
CREATE POLICY "promotions_read_active"
  ON promotions
  FOR SELECT
  TO authenticated
  USING (
    status = 'active' AND expires_at > now()
  );

CREATE POLICY "promotions_manage_own"
  ON promotions
  FOR ALL
  TO authenticated
  USING (
    partner_id = auth.uid() OR
    (auth.jwt() ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    partner_id = auth.uid() OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Create policies for promotion_claims
CREATE POLICY "promotion_claims_read_own"
  ON promotion_claims
  FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM promotions
      WHERE promotions.id = promotion_claims.promotion_id
      AND promotions.partner_id = auth.uid()
    ) OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "promotion_claims_insert_own"
  ON promotion_claims
  FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM promotions
      WHERE promotions.id = promotion_id
      AND promotions.status = 'active'
      AND promotions.expires_at > now()
    )
  );

CREATE POLICY "promotion_claims_update_partner"
  ON promotion_claims
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM promotions
      WHERE promotions.id = promotion_claims.promotion_id
      AND promotions.partner_id = auth.uid()
    ) OR
    (auth.jwt() ->> 'role')::text = 'admin'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM promotions
      WHERE promotions.id = promotion_claims.promotion_id
      AND promotions.partner_id = auth.uid()
    ) OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Create indexes
CREATE INDEX idx_promotions_status ON promotions(status);
CREATE INDEX idx_promotions_expires_at ON promotions(expires_at);
CREATE INDEX idx_promotions_partner_id ON promotions(partner_id);
CREATE INDEX idx_promotion_claims_profile_id ON promotion_claims(profile_id);
CREATE INDEX idx_promotion_claims_promotion_id ON promotion_claims(promotion_id);
CREATE INDEX idx_promotion_claims_status ON promotion_claims(status);

-- Insert sample promotions
INSERT INTO promotions (title, description, type, reward_amount, expires_at, partner_id, terms_conditions) VALUES
-- Health Assessment Offers
('Free Health Assessment', 'Complete a comprehensive health assessment and receive a $50 credit towards your next wellness service', 'offer', 50, now() + interval '30 days', (SELECT id FROM partners WHERE name = 'Dr. Sarah Chen'), 'Must be a registered member. Credit valid for 90 days after assessment completion.'),
('Executive Health Screening Discount', 'Get 20% off our Executive Health Screening package', 'offer', 199.80, now() + interval '60 days', (SELECT id FROM partners WHERE name = 'Dr. Michael Rodriguez'), 'New patients only. Cannot be combined with other offers.'),

-- Wellness Research Studies
('Sleep Quality Study', 'Participate in our 2-week sleep quality study and earn rewards', 'study', 150, now() + interval '45 days', (SELECT id FROM partners WHERE name = 'Dr. Jennifer Lee'), 'Requires daily sleep tracking and weekly check-ins. Must complete full 2-week period.'),
('Stress Management Research', 'Join our stress management research program', 'study', 200, now() + interval '90 days', (SELECT id FROM partners WHERE name = 'Dr. William Brown'), 'Participants must attend 4 weekly sessions and complete all assessments.'),

-- Satisfaction Surveys
('Patient Experience Survey', 'Share your feedback about our services', 'survey', 25, now() + interval '15 days', (SELECT id FROM partners WHERE name = 'Dr. Emily Thompson'), 'Must have had at least one service in the past 30 days. One reward per member.'),
('Wellness Program Feedback', 'Help us improve our wellness programs', 'survey', 30, now() + interval '20 days', (SELECT id FROM partners WHERE name = 'Dr. Amanda White'), 'Open to all current wellness program participants.'),

-- Special Offers
('First-Time Aesthetic Consultation', 'Book your first aesthetic consultation and receive $100 off any treatment', 'offer', 100, now() + interval '30 days', (SELECT id FROM partners WHERE name = 'Dr. Rachel Green'), 'New aesthetic patients only. Must book treatment within 30 days of consultation.'),
('Spring Wellness Package', 'Save 25% on our comprehensive wellness package', 'offer', 250, now() + interval '40 days', (SELECT id FROM partners WHERE name = 'Dr. Thomas Anderson'), 'Package includes 3 wellness sessions and 1 nutrition consultation.'),
('Medical Cosmetic Special', '15% off any medical cosmetic treatment', 'offer', 150, now() + interval '25 days', (SELECT id FROM partners WHERE name = 'Dr. Victoria Adams'), 'Must book appointment within promotion period. Cannot be combined with other offers.'),
('Luxury Spa Day Discount', 'Enjoy 20% off our Premium Spa Day Package', 'offer', 179.80, now() + interval '35 days', (SELECT id FROM partners WHERE name = 'Dr. Sophie Taylor'), 'Valid for weekday appointments only. 48-hour cancellation notice required.');