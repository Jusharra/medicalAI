/*
  # Add Membership Management Tables

  1. New Tables
    - `payment_methods`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles)
      - `stripe_payment_method_id` (text)
      - `card_last4` (text)
      - `card_brand` (text)
      - `exp_month` (integer)
      - `exp_year` (integer)
      - `is_default` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `payment_history`
      - `id` (uuid, primary key)
      - `membership_id` (uuid, references memberships)
      - `amount` (numeric)
      - `status` (text)
      - `payment_method_id` (uuid, references payment_methods)
      - `created_at` (timestamptz)

  2. Changes to Existing Tables
    - Add `stripe_payment_method_id` to memberships table
    - Add `billing_period_start` to memberships table

  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users to manage their own payment methods and view their payment history
*/

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_method_id text NOT NULL,
  card_last4 text NOT NULL,
  card_brand text NOT NULL,
  exp_month integer NOT NULL,
  exp_year integer NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payment_history table
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid REFERENCES memberships(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL,
  payment_method_id uuid REFERENCES payment_methods(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to memberships table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memberships' AND column_name = 'stripe_payment_method_id'
  ) THEN
    ALTER TABLE memberships ADD COLUMN stripe_payment_method_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memberships' AND column_name = 'billing_period_start'
  ) THEN
    ALTER TABLE memberships ADD COLUMN billing_period_start timestamptz;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Policies for payment_methods
CREATE POLICY "Users can view own payment methods"
  ON payment_methods
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own payment methods"
  ON payment_methods
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own payment methods"
  ON payment_methods
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can delete own payment methods"
  ON payment_methods
  FOR DELETE
  TO authenticated
  USING (profile_id = auth.uid());

-- Policies for payment_history
CREATE POLICY "Users can view own payment history"
  ON payment_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.id = payment_history.membership_id
      AND m.profile_id = auth.uid()
    )
  );

-- Create trigger to update updated_at on payment_methods
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_updated_at();