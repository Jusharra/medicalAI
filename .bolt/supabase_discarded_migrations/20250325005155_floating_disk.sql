/*
  # Create Services and Purchases Tables
  
  1. New Tables
    - services: Stores service catalog information
    - purchases: Tracks member service purchases and appointments
    
  2. Security
    - Enable RLS
    - Add policies for access control
*/

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('aesthetic', 'medical_cosmetic', 'spa', 'wellness')),
  price numeric NOT NULL,
  duration text NOT NULL,
  image_url text,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE RESTRICT,
  amount_paid numeric NOT NULL,
  purchase_date timestamptz DEFAULT now(),
  appointment_date timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
  payment_method text NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'refunded')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view available services"
  ON services
  FOR SELECT
  TO public
  USING (available = true);

CREATE POLICY "Users can view own purchases"
  ON purchases
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

-- Create indexes
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_available ON services(available);
CREATE INDEX idx_purchases_profile_id ON purchases(profile_id);
CREATE INDEX idx_purchases_service_id ON purchases(service_id);
CREATE INDEX idx_purchases_status ON purchases(status);
CREATE INDEX idx_purchases_payment_status ON purchases(payment_status);

-- Insert sample services
INSERT INTO services (name, description, category, price, duration, image_url) VALUES
-- Aesthetic Services
(
  'Advanced Facial Treatment',
  'Comprehensive facial treatment including deep cleansing, exfoliation, and custom mask.',
  'aesthetic',
  199.99,
  '90 minutes',
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80'
),
(
  'LED Light Therapy',
  'Advanced light therapy treatment for skin rejuvenation and acne treatment.',
  'aesthetic',
  149.99,
  '45 minutes',
  'https://images.unsplash.com/photo-1573461160327-b450ce3d8e7f?auto=format&fit=crop&w=800&q=80'
),
(
  'Microdermabrasion',
  'Non-invasive exfoliation treatment for smoother, brighter skin.',
  'aesthetic',
  179.99,
  '60 minutes',
  'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=800&q=80'
),

-- Medical Cosmetic Services
(
  'Botox Treatment',
  'FDA-approved treatment for reducing fine lines and wrinkles.',
  'medical_cosmetic',
  599.99,
  '45 minutes',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=800&q=80'
),
(
  'Dermal Fillers',
  'Advanced dermal filler treatment for volume restoration and contouring.',
  'medical_cosmetic',
  799.99,
  '60 minutes',
  'https://images.unsplash.com/photo-1614859324669-927e70f7e6ff?auto=format&fit=crop&w=800&q=80'
),
(
  'Laser Skin Resurfacing',
  'Advanced laser treatment for skin texture improvement and rejuvenation.',
  'medical_cosmetic',
  899.99,
  '90 minutes',
  'https://images.unsplash.com/photo-1587150837976-284ef5951b87?auto=format&fit=crop&w=800&q=80'
),

-- Spa Treatments
(
  'Deep Tissue Massage',
  'Therapeutic massage focusing on deep muscle tension relief.',
  'spa',
  129.99,
  '60 minutes',
  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80'
),
(
  'Hot Stone Therapy',
  'Relaxing massage therapy using heated stones for deep muscle relaxation.',
  'spa',
  149.99,
  '90 minutes',
  'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=800&q=80'
),
(
  'Aromatherapy Massage',
  'Therapeutic massage using essential oils for relaxation and healing.',
  'spa',
  139.99,
  '75 minutes',
  'https://images.unsplash.com/photo-1617952986600-802f965dcdbc?auto=format&fit=crop&w=800&q=80'
),

-- Wellness Services
(
  'Nutrition Consultation',
  'Personalized nutrition planning and dietary guidance.',
  'wellness',
  199.99,
  '60 minutes',
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80'
),
(
  'Fitness Assessment',
  'Comprehensive fitness evaluation and personalized workout planning.',
  'wellness',
  149.99,
  '90 minutes',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80'
),
(
  'Meditation Session',
  'Guided meditation and mindfulness training.',
  'wellness',
  89.99,
  '45 minutes',
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80'
);

-- Insert sample purchases
INSERT INTO purchases (
  profile_id,
  service_id,
  amount_paid,
  purchase_date,
  appointment_date,
  status,
  payment_method,
  payment_status
)
SELECT
  auth.uid(),
  id as service_id,
  price as amount_paid,
  now() - interval '1 month' * floor(random() * 3) as purchase_date,
  now() + interval '1 day' * floor(random() * 30) as appointment_date,
  CASE floor(random() * 4)
    WHEN 0 THEN 'pending'
    WHEN 1 THEN 'completed'
    WHEN 2 THEN 'cancelled'
    ELSE 'refunded'
  END as status,
  CASE floor(random() * 3)
    WHEN 0 THEN 'credit_card'
    WHEN 1 THEN 'debit_card'
    ELSE 'paypal'
  END as payment_method,
  CASE floor(random() * 3)
    WHEN 0 THEN 'pending'
    WHEN 1 THEN 'succeeded'
    ELSE 'failed'
  END as payment_status
FROM services
WHERE random() < 0.7
AND EXISTS (
  SELECT 1 FROM auth.users WHERE id = auth.uid()
);