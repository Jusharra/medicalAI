-- Create member_rewards table
CREATE TABLE IF NOT EXISTS member_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  value numeric,
  used_at timestamptz,
  expires_at timestamptz,
  renewal_date timestamptz,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'used', 'expired')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE member_rewards ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own rewards"
  ON member_rewards
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Create indexes
CREATE INDEX idx_member_rewards_profile_id ON member_rewards(profile_id);
CREATE INDEX idx_member_rewards_status ON member_rewards(status);
CREATE INDEX idx_member_rewards_expires_at ON member_rewards(expires_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION handle_member_rewards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_member_rewards_updated_at
  BEFORE UPDATE ON member_rewards
  FOR EACH ROW
  EXECUTE FUNCTION handle_member_rewards_updated_at();