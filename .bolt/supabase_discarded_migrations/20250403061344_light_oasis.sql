/*
  # Add Partner Dashboard Support

  1. Changes
    - Add vacation_mode column to partners table
    - Add accepting_new_patients column to partners table
    - Add partner_id column to appointments table if it doesn't exist
    - Create indexes for better performance

  2. Security
    - No changes to RLS policies needed
*/

-- Add columns to partners table
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS vacation_mode boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS accepting_new_patients boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS bio text;

-- Make sure partner_id exists in appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES partners(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_partners_vacation_mode ON partners(vacation_mode);
CREATE INDEX IF NOT EXISTS idx_partners_accepting_new_patients ON partners(accepting_new_patients);
CREATE INDEX IF NOT EXISTS idx_appointments_partner_id ON appointments(partner_id);

-- Update existing appointments to have partner_id if they don't already
UPDATE appointments a
SET partner_id = ctm.partner_id
FROM care_team_members ctm
WHERE a.profile_id = ctm.profile_id
AND a.partner_id IS NULL
AND ctm.partner_id IS NOT NULL;

-- Update partners with more detailed information
UPDATE partners
SET 
  bio = CASE 
    WHEN name LIKE '%Chen%' THEN 'Board-certified in Internal Medicine with over 15 years of experience. Specializing in preventive care and chronic disease management.'
    WHEN name LIKE '%Rodriguez%' THEN 'Family Medicine physician focused on holistic health and wellness. Passionate about helping patients achieve optimal health through lifestyle modifications.'
    WHEN name LIKE '%Thompson%' THEN 'Experienced physician with expertise in geriatric care and chronic disease management. Committed to providing compassionate, patient-centered care.'
    WHEN name LIKE '%Wilson%' THEN 'Board-certified Family Medicine physician with special interest in sports medicine and preventive care. Dedicated to building long-term relationships with patients.'
    WHEN name LIKE '%Kim%' THEN 'Cardiologist with extensive training in advanced cardiac care. Combines cutting-edge treatments with personalized care plans.'
    WHEN name LIKE '%Patel%' THEN 'Integrative Medicine specialist blending conventional and evidence-based complementary approaches. Focus on treating the whole person.'
    ELSE 'Experienced healthcare provider dedicated to delivering exceptional patient care and personalized treatment plans.'
  END,
  accepting_new_patients = true,
  vacation_mode = false
WHERE bio IS NULL;