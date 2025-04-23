/*
  # Create Transactions Table for Partner Payouts

  1. New Tables
    - `transactions`
      - `id` (uuid, primary key)
      - `partner_id` (uuid, references partners)
      - `amount` (numeric)
      - `type` (text, 'payout' or 'earning')
      - `status` (text, 'pending', 'completed', or 'failed')
      - `description` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for:
      - Partners to view their own transactions
      - Admins to manage all transactions
*/

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  type text NOT NULL CHECK (type IN ('payout', 'earning')),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Partners can view their own transactions"
  ON transactions
  FOR SELECT
  TO authenticated
  USING (
    partner_id = auth.uid() OR
    (auth.jwt() ->> 'role')::text = 'admin'
  );

CREATE POLICY "Admins can manage all transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'role')::text = 'admin'
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_partner_id ON transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Insert sample data for testing
INSERT INTO transactions (
  partner_id,
  amount,
  type,
  status,
  description,
  created_at
)
SELECT
  p.id as partner_id,
  CASE 
    WHEN random() < 0.7 THEN (random() * 300 + 100)::numeric -- Earnings $100-$400
    ELSE (random() * 1000 + 500)::numeric -- Payouts $500-$1500
  END as amount,
  CASE 
    WHEN random() < 0.7 THEN 'earning'
    ELSE 'payout'
  END as type,
  CASE 
    WHEN random() < 0.8 THEN 'completed'
    WHEN random() < 0.9 THEN 'pending'
    ELSE 'failed'
  END as status,
  CASE 
    WHEN random() < 0.7 THEN 'Service: ' || (
      CASE floor(random() * 4)
        WHEN 0 THEN 'Consultation'
        WHEN 1 THEN 'Follow-up'
        WHEN 2 THEN 'Wellness Check'
        ELSE 'Specialist Referral'
      END
    )
    ELSE 'Monthly payout - ' || to_char(now() - (random() * interval '90 days'), 'Month')
  END as description,
  now() - (random() * interval '90 days') as created_at
FROM partners p
CROSS JOIN generate_series(1, 10) -- 10 transactions per partner
WHERE p.status = 'active'
LIMIT 100; -- Limit to 100 total transactions