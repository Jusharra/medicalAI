-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('aesthetic', 'medical_cosmetic', 'spa', 'wellness')),
  price numeric NOT NULL,
  duration interval,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  amount_paid numeric NOT NULL,
  purchase_date timestamptz DEFAULT now(),
  appointment_date timestamptz,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  payment_method text,
  payment_status text NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'failed', 'refunded')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active services"
  ON services
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can view own purchases"
  ON purchases
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Create indexes
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_is_active ON services(is_active);
CREATE INDEX idx_purchases_profile_id ON purchases(profile_id);
CREATE INDEX idx_purchases_service_id ON purchases(service_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_purchase_date ON purchases(purchase_date);

-- Insert sample services
INSERT INTO services (name, description, category, price, duration, image_url) VALUES
('Hydrafacial Treatment', 'Advanced facial treatment that cleanses, exfoliates, and hydrates skin', 'aesthetic', 199.99, '60 minutes', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=300&q=80'),
('Botox Treatment', 'Cosmetic injection to reduce facial wrinkles', 'medical_cosmetic', 499.99, '45 minutes', 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=300&q=80'),
('Deep Tissue Massage', 'Therapeutic massage targeting deep muscle tissue', 'spa', 129.99, '90 minutes', 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=300&q=80'),
('LED Light Therapy', 'Advanced skin treatment using LED technology', 'aesthetic', 149.99, '30 minutes', 'https://images.unsplash.com/photo-1573461160327-b450ce3d8e7f?auto=format&fit=crop&w=300&q=80'),
('Vitamin IV Therapy', 'Intravenous vitamin and mineral supplementation', 'wellness', 299.99, '45 minutes', 'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&w=300&q=80'),
('Chemical Peel', 'Professional chemical exfoliation treatment', 'aesthetic', 179.99, '45 minutes', 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=300&q=80'),
('Hot Stone Massage', 'Relaxing massage therapy using heated stones', 'spa', 159.99, '75 minutes', 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=300&q=80'),
('Dermal Fillers', 'Injectable treatment for volume restoration', 'medical_cosmetic', 699.99, '60 minutes', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=300&q=80');

-- Insert sample purchases for test user
INSERT INTO purchases (
  profile_id,
  service_id,
  amount_paid,
  purchase_date,
  appointment_date,
  status,
  payment_method
)
SELECT 
  'efbd2fb4-4a3b-4d6e-a553-eec02a567ba8',
  id,
  price,
  now() - (random() * interval '60 days'),
  now() - (random() * interval '60 days'),
  'completed',
  CASE (random() * 2)::int
    WHEN 0 THEN 'credit_card'
    WHEN 1 THEN 'debit_card'
    ELSE 'bank_transfer'
  END
FROM services
WHERE random() < 0.7;