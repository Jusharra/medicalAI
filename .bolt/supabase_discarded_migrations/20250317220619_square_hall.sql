/*
  # Update Medical Services and Pricing

  1. Changes
    - Add more detailed medical services to appointment_types table
    - Update existing services with more specific descriptions and pricing
    - Add specialty field to categorize services

  2. Security
    - Maintain existing RLS policies
*/

-- Add specialty column to appointment_types if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointment_types' AND column_name = 'specialty'
  ) THEN
    ALTER TABLE appointment_types ADD COLUMN specialty text;
  END IF;
END $$;

-- Clear existing appointment types
TRUNCATE appointment_types CASCADE;

-- Insert comprehensive list of medical services
INSERT INTO appointment_types (name, description, base_price, duration, specialty) VALUES
  -- Primary Care Services
  ('General Consultation', 'Comprehensive medical evaluation with a primary care physician', 150, '30 minutes'::interval, 'Primary Care'),
  ('Annual Physical', 'Complete yearly health assessment and preventive screening', 250, '60 minutes'::interval, 'Primary Care'),
  ('Urgent Care Visit', 'Same-day care for non-emergency medical issues', 175, '30 minutes'::interval, 'Primary Care'),
  
  -- Specialist Consultations
  ('Cardiology Consultation', 'Heart health evaluation with a cardiologist', 300, '45 minutes'::interval, 'Cardiology'),
  ('Dermatology Screening', 'Comprehensive skin examination and treatment', 250, '30 minutes'::interval, 'Dermatology'),
  ('Orthopedic Assessment', 'Musculoskeletal evaluation and treatment planning', 275, '45 minutes'::interval, 'Orthopedics'),
  
  -- Mental Health Services
  ('Psychiatric Consultation', 'Initial psychiatric evaluation and treatment planning', 300, '60 minutes'::interval, 'Mental Health'),
  ('Therapy Session', 'Individual counseling with licensed therapist', 200, '50 minutes'::interval, 'Mental Health'),
  ('Stress Management', 'Guided session for stress and anxiety management', 150, '45 minutes'::interval, 'Mental Health'),
  
  -- Preventive Care
  ('Wellness Check', 'Preventive health screening and lifestyle consultation', 175, '45 minutes'::interval, 'Preventive Care'),
  ('Nutrition Consultation', 'Personalized dietary planning and counseling', 150, '45 minutes'::interval, 'Nutrition'),
  ('Weight Management', 'Comprehensive weight management program consultation', 175, '45 minutes'::interval, 'Nutrition'),
  
  -- Physical Therapy
  ('PT Initial Assessment', 'Comprehensive physical therapy evaluation', 200, '60 minutes'::interval, 'Physical Therapy'),
  ('PT Follow-up', 'Physical therapy treatment session', 120, '45 minutes'::interval, 'Physical Therapy'),
  ('Sports Rehabilitation', 'Specialized rehabilitation for sports injuries', 150, '45 minutes'::interval, 'Physical Therapy'),
  
  -- Specialized Services
  ('Sleep Study Consultation', 'Sleep disorder evaluation and treatment planning', 250, '45 minutes'::interval, 'Sleep Medicine'),
  ('Allergy Testing', 'Comprehensive allergy testing and consultation', 300, '60 minutes'::interval, 'Allergy/Immunology'),
  ('Pain Management', 'Chronic pain evaluation and treatment planning', 275, '45 minutes'::interval, 'Pain Management'),
  
  -- Follow-up Visits
  ('Follow-up Consultation', 'Follow-up visit with primary care physician', 100, '20 minutes'::interval, 'Primary Care'),
  ('Specialist Follow-up', 'Follow-up visit with specialist', 150, '30 minutes'::interval, 'Specialty Care');