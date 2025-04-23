/*
  # Optimize Revenue and Partner System
  
  1. Changes
    - Add high-ticket membership tiers
    - Enhance commission tracking
    - Add referral program
    - Track conversion metrics
*/

-- Add new membership tiers
ALTER TABLE memberships
ADD COLUMN IF NOT EXISTS tier text CHECK (tier IN ('essential', 'premium', 'elite', 'ultra')),
ADD COLUMN IF NOT EXISTS annual_commitment boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_renewal boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS referral_code text,
ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES profiles(id);

-- Create referral tracking
CREATE TABLE IF NOT EXISTS referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  discount_percent integer CHECK (discount_percent BETWEEN 0 AND 100),
  commission_rate numeric CHECK (commission_rate BETWEEN 0 AND 100),
  max_uses integer DEFAULT -1,
  times_used integer DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add commission tiers
CREATE TABLE IF NOT EXISTS commission_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  min_referrals integer NOT NULL,
  commission_rate numeric NOT NULL CHECK (commission_rate BETWEEN 0 AND 100),
  bonus_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Insert default commission tiers
INSERT INTO commission_tiers (name, min_referrals, commission_rate, bonus_amount) VALUES
('Bronze', 0, 20, 0),
('Silver', 5, 25, 500),
('Gold', 10, 30, 1000),
('Platinum', 25, 35, 2500),
('Diamond', 50, 40, 5000);

-- Add conversion tracking
CREATE TABLE IF NOT EXISTS conversion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('page_view', 'chat', 'assessment', 'signup', 'payment')),
  source text,
  utm_medium text,
  utm_source text,
  utm_campaign text,
  revenue numeric,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_memberships_tier ON memberships(tier);
CREATE INDEX IF NOT EXISTS idx_memberships_referral ON memberships(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_conversion_events_lead ON conversion_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_type ON conversion_events(event_type);

-- Add function to calculate partner tier
CREATE OR REPLACE FUNCTION calculate_partner_tier()
RETURNS TRIGGER AS $$
DECLARE
  referral_count integer;
  new_tier record;
BEGIN
  -- Get total successful referrals
  SELECT COUNT(*) INTO referral_count
  FROM memberships m
  WHERE m.referred_by = NEW.partner_id
  AND m.status = 'active'
  AND m.payment_status = 'succeeded';

  -- Get appropriate commission tier
  SELECT * INTO new_tier
  FROM commission_tiers
  WHERE min_referrals <= referral_count
  ORDER BY min_referrals DESC
  LIMIT 1;

  -- Update partner commission rate and add bonus if tier changed
  IF new_tier.commission_rate != OLD.commission_rate THEN
    UPDATE partners
    SET commission_rate = new_tier.commission_rate,
        pending_balance = pending_balance + new_tier.bonus_amount
    WHERE id = NEW.partner_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for tier updates
CREATE TRIGGER update_partner_tier
  AFTER INSERT OR UPDATE ON partner_commissions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_partner_tier();

-- Add function to track conversions
CREATE OR REPLACE FUNCTION track_conversion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO conversion_events (
    lead_id,
    event_type,
    source,
    utm_medium,
    utm_source,
    utm_campaign,
    revenue
  ) VALUES (
    NEW.id,
    CASE
      WHEN TG_TABLE_NAME = 'leads' THEN 'signup'
      WHEN TG_TABLE_NAME = 'memberships' THEN 'payment'
    END,
    NEW.source,
    current_setting('app.current_utm_medium', true),
    current_setting('app.current_utm_source', true),
    current_setting('app.current_utm_campaign', true),
    CASE
      WHEN TG_TABLE_NAME = 'memberships' THEN NEW.total_amount
      ELSE 0
    END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create conversion tracking triggers
CREATE TRIGGER track_lead_conversion
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION track_conversion();

CREATE TRIGGER track_membership_conversion
  AFTER INSERT ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION track_conversion();