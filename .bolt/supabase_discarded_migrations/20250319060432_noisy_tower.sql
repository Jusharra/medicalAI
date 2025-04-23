/*
  # Create Memberships Table with Required Fields
  
  1. Purpose
    - Store membership information
    - Track payment and subscription status
    - Link members to their subscription plans
    
  2. Changes
    - Add required plan_type field
    - Add all necessary membership fields
    - Create proper constraints and indexes
*/

-- Create memberships table
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type text NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_payment_method_id text,
  status text NOT NULL DEFAULT 'active',
  payment_status text NOT NULL DEFAULT 'pending',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  total_amount numeric,
  platform_fee numeric,
  partner_amount numeric,
  partner_id uuid REFERENCES partners(id),
  stripe_transfer_id text,
  transfer_status text DEFAULT 'pending',
  billing_period_start timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'cancelled')),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'succeeded', 'failed')),
  CONSTRAINT valid_plan_type CHECK (plan_type IN ('Essential Care', 'Premium Care', 'Elite Care'))
);

-- Enable RLS
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own memberships"
  ON memberships
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_memberships_profile_id ON memberships(profile_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_payment_status ON memberships(payment_status);

-- Create test member with active membership
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  last_sign_in_at
) VALUES (
  'efbd2fb4-4a3b-4d6e-a553-eec02a567ba8',
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'test@vitale.health',
  crypt('Test123!', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  now(),
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Create profile for test member
INSERT INTO profiles (
  id,
  first_name,
  last_name,
  phone,
  created_at,
  updated_at
) VALUES (
  'efbd2fb4-4a3b-4d6e-a553-eec02a567ba8',
  'Test',
  'Member',
  '+1-555-0123',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Create active membership for test member
INSERT INTO memberships (
  profile_id,
  plan_type,
  status,
  payment_status,
  current_period_start,
  current_period_end,
  total_amount,
  platform_fee,
  partner_amount,
  created_at,
  updated_at
) VALUES (
  'efbd2fb4-4a3b-4d6e-a553-eec02a567ba8',
  'Premium Care',
  'active',
  'succeeded',
  now(),
  now() + interval '1 month',
  499.00,
  99.80,
  399.20,
  now(),
  now()
) ON CONFLICT DO NOTHING;