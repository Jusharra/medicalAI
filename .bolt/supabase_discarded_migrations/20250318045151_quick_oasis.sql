/*
  # Add Stripe membership tables and policies
  
  1. New Tables
    - stripe_customers
      - id (uuid, primary key)
      - user_id (uuid, references auth.users)
      - customer_id (text, Stripe customer ID)
      - subscription_id (text, Stripe subscription ID)
      - subscription_status (text)
      - created_at (timestamptz)
      - updated_at (timestamptz)

  2. Security
    - Enable RLS on stripe_customers
    - Add policies for user access
*/

-- Create stripe_customers table
CREATE TABLE IF NOT EXISTS stripe_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id text NOT NULL,
  subscription_id text,
  subscription_status text CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own stripe customer"
  ON stripe_customers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_stripe_customers_updated_at
  BEFORE UPDATE ON stripe_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX stripe_customers_user_id_idx ON stripe_customers(user_id);
CREATE INDEX stripe_customers_subscription_status_idx ON stripe_customers(subscription_status);