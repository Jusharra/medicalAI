/*
  # Update Memberships Table for Stripe Integration
  
  1. Purpose
    - Add Stripe-specific fields
    - Add proper constraints and indexes
    - Enable webhook handling
    
  2. Changes
    - Add Stripe metadata fields
    - Add payment tracking fields
    - Add subscription status tracking
*/

-- Drop existing memberships table
DROP TABLE IF EXISTS memberships CASCADE;

-- Create memberships table with Stripe fields
CREATE TABLE memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Plan Information
  plan_type text NOT NULL CHECK (plan_type IN ('Essential Care', 'Premium Care', 'Elite Care')),
  is_annual boolean DEFAULT false,
  
  -- Stripe Customer Info
  stripe_customer_id text UNIQUE,
  stripe_payment_method_id text,
  
  -- Stripe Subscription Info
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  stripe_product_id text,
  
  -- Payment Status
  payment_status text NOT NULL DEFAULT 'pending' 
    CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'refunded')),
  last_payment_error text,
  last_payment_attempt timestamptz,
  
  -- Subscription Status
  status text NOT NULL DEFAULT 'incomplete' 
    CHECK (status IN ('incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  trial_start timestamptz,
  trial_end timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  
  -- Billing Details
  currency text DEFAULT 'usd',
  interval text CHECK (interval IN ('month', 'year')),
  interval_count integer DEFAULT 1,
  total_amount numeric NOT NULL,
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
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
CREATE INDEX idx_memberships_profile_id ON memberships(profile_id);
CREATE INDEX idx_memberships_stripe_customer ON memberships(stripe_customer_id);
CREATE INDEX idx_memberships_stripe_subscription ON memberships(stripe_subscription_id);
CREATE INDEX idx_memberships_status ON memberships(status);
CREATE INDEX idx_memberships_payment_status ON memberships(payment_status);
CREATE INDEX idx_memberships_current_period ON memberships(current_period_start, current_period_end);

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

-- Create function to handle Stripe webhook events
CREATE OR REPLACE FUNCTION handle_stripe_webhook_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Update membership status based on Stripe event
  IF NEW.stripe_subscription_id IS NOT NULL THEN
    -- Handle subscription status changes
    IF NEW.status = 'active' THEN
      NEW.payment_status := 'succeeded';
    ELSIF NEW.status IN ('past_due', 'unpaid') THEN
      NEW.payment_status := 'failed';
    END IF;
  END IF;

  -- Set cancel_at when cancel_at_period_end is enabled
  IF NEW.cancel_at_period_end = true AND NEW.cancel_at IS NULL THEN
    NEW.cancel_at := NEW.current_period_end;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_stripe_webhook_event
  BEFORE INSERT OR UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION handle_stripe_webhook_event();