/*
  # Add More Services Data

  1. Changes
    - Add comprehensive list of medical, wellness, and aesthetic services
    - Include detailed descriptions and pricing
    - Add image URLs from Unsplash for visual representation

  2. Security
    - No changes to RLS policies needed
    - Only adding data to existing table
*/

-- Insert additional services
INSERT INTO services (name, category, description, price, duration, image_url, active) VALUES
-- Medical Services
('Executive Health Screening', 'medical', 'Comprehensive executive health screening including advanced diagnostics and personalized health report', 999, '180 minutes', 'https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?auto=format&fit=crop&w=1200&q=80', true),
('Advanced Cardiac Assessment', 'medical', 'Complete cardiac health evaluation with state-of-the-art diagnostic tools', 799, '120 minutes', 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?auto=format&fit=crop&w=1200&q=80', true),
('Sleep Health Consultation', 'medical', 'Expert consultation for sleep disorders and optimization', 349, '90 minutes', 'https://images.unsplash.com/photo-1541199249251-f713e6145474?auto=format&fit=crop&w=1200&q=80', true),
('Nutritional Medicine Consultation', 'medical', 'Personalized nutritional assessment and treatment planning', 299, '60 minutes', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80', true),

-- Wellness Services
('Mindfulness and Stress Management', 'wellness', 'Guided session for stress reduction and mental wellness techniques', 199, '90 minutes', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80', true),
('Holistic Health Assessment', 'wellness', 'Comprehensive evaluation of physical, mental, and emotional wellbeing', 449, '120 minutes', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80', true),
('Fitness Performance Analysis', 'wellness', 'Advanced fitness assessment and personalized training program', 299, '90 minutes', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80', true),
('Meditation and Breathwork Session', 'wellness', 'Expert-guided meditation and breathing techniques', 149, '60 minutes', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80', true),

-- Aesthetic Services
('Advanced Skin Analysis', 'aesthetic', 'Comprehensive skin health assessment with advanced imaging', 299, '60 minutes', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80', true),
('Premium Facial Treatment', 'aesthetic', 'Luxury facial treatment with premium products and techniques', 399, '90 minutes', 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1200&q=80', true),
('Body Contouring Consultation', 'aesthetic', 'Personalized body sculpting and treatment planning', 249, '60 minutes', 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?auto=format&fit=crop&w=1200&q=80', true),
('Anti-Aging Treatment Package', 'aesthetic', 'Comprehensive anti-aging treatment with advanced procedures', 899, '120 minutes', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80', true),

-- Medical Cosmetic Services
('Advanced Dermal Fillers', 'medical_cosmetic', 'Premium dermal filler consultation and treatment planning', 449, '90 minutes', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1200&q=80', true),
('Laser Skin Rejuvenation', 'medical_cosmetic', 'Advanced laser treatment consultation and assessment', 399, '60 minutes', 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=1200&q=80', true),
('Medical Grade Facial', 'medical_cosmetic', 'Clinical-grade facial treatment with medical supervision', 299, '90 minutes', 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80', true),

-- Spa Services
('Luxury Massage Therapy', 'spa', 'Premium massage treatment with aromatherapy', 249, '90 minutes', 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80', true),
('Hydrating Body Treatment', 'spa', 'Full-body hydration and rejuvenation treatment', 299, '120 minutes', 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80', true),
('Detox and Renewal Package', 'spa', 'Comprehensive detox treatment with premium products', 399, '150 minutes', 'https://images.unsplash.com/photo-1531853121101-cb94c8ed218d?auto=format&fit=crop&w=1200&q=80', true),
('Premium Spa Day Package', 'spa', 'Full day of luxury spa treatments and services', 899, '360 minutes', 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80', true);