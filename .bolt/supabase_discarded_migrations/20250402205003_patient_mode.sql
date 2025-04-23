/*
  # Add Pharmacy Demo Data

  1. New Data
    - Add detailed pharmacy data with realistic information
    - Include various pharmacy types and services
    - Add geographic distribution

  2. Security
    - No changes to RLS policies needed
*/

-- Update existing pharmacies with more detailed information
UPDATE pharmacies SET
  services = CASE name
    WHEN 'Bay Area Pharmacy' THEN 'Prescription filling, Compounding, Immunizations, Health screenings, Medication therapy management, Medication synchronization'
    WHEN 'Wellness Pharmacy' THEN 'Prescription filling, Specialty medications, Medication therapy management, Compounding, Immunizations, Delivery'
    WHEN 'Care Plus Pharmacy' THEN 'Prescription filling, Medication synchronization, Vaccinations, Health screenings, Medication reviews'
    WHEN 'Downtown Drugstore' THEN 'Prescription filling, OTC medications, Medical supplies, Durable medical equipment, Compression stockings'
    WHEN 'Express Scripts Pharmacy' THEN 'Prescription filling, Mail order, Specialty medications, Automatic refills, Medication therapy management'
    ELSE 'Prescription filling, OTC medications'
  END,
  insurance_accepted = CASE name
    WHEN 'Bay Area Pharmacy' THEN 'Blue Cross, Aetna, Cigna, Medicare, Medicaid, United Healthcare, Humana'
    WHEN 'Wellness Pharmacy' THEN 'All major insurance plans accepted including Medicare Part D and Medicaid'
    WHEN 'Care Plus Pharmacy' THEN 'United Healthcare, Kaiser, Medicare, Medicaid, Blue Cross, Cigna, Aetna'
    WHEN 'Downtown Drugstore' THEN 'Most insurance plans accepted, call for details'
    WHEN 'Express Scripts Pharmacy' THEN 'All major insurance plans, Medicare Part D, Medicaid, Tricare'
    ELSE 'Major insurance plans accepted'
  END,
  hours = CASE name
    WHEN 'Bay Area Pharmacy' THEN 'Mon-Fri: 8am-8pm, Sat-Sun: 9am-6pm'
    WHEN 'Wellness Pharmacy' THEN 'Mon-Sun: 24 hours'
    WHEN 'Care Plus Pharmacy' THEN 'Mon-Sat: 9am-7pm, Sun: 10am-5pm'
    WHEN 'Downtown Drugstore' THEN 'Mon-Fri: 8am-6pm, Sat: 9am-3pm, Sun: Closed'
    WHEN 'Express Scripts Pharmacy' THEN 'Mon-Fri: 9am-9pm, Sat: 9am-5pm, Sun: Closed'
    ELSE 'Mon-Fri: 9am-6pm, Sat-Sun: Closed'
  END;

-- Insert additional pharmacies with more detailed information
INSERT INTO pharmacies (
  name, 
  address, 
  phone, 
  email, 
  hours, 
  services, 
  insurance_accepted, 
  delivery_available, 
  delivery_radius, 
  status
) VALUES
-- Neighborhood pharmacies
('Golden Gate Pharmacy', '1001 Van Ness Ave, San Francisco, CA 94109', '+1 (415) 555-0201', 'info@goldengatepharmacy.com', 'Mon-Fri: 8am-9pm, Sat-Sun: 9am-7pm', 'Prescription filling, Compounding, Immunizations, Health screenings, Medication therapy management, Diabetes care', 'Blue Cross, Aetna, Cigna, Medicare, Medicaid, Kaiser, United Healthcare', true, 8, 'active'),
('Pacific Heights Pharmacy', '2222 Fillmore St, San Francisco, CA 94115', '+1 (415) 555-0202', 'info@pacificheightsrx.com', 'Mon-Fri: 8am-8pm, Sat: 9am-6pm, Sun: 10am-4pm', 'Prescription filling, Specialty medications, Compounding, Immunizations, Medication synchronization, Delivery', 'All major insurance plans, Medicare Part D, Medicaid', true, 12, 'active'),
('Mission District Pharmacy', '2424 Mission St, San Francisco, CA 94110', '+1 (415) 555-0203', 'info@missionrx.com', 'Mon-Sun: 8am-10pm', 'Prescription filling, OTC medications, Immunizations, Health screenings, Medication reviews, Spanish-speaking staff', 'Blue Cross, Aetna, Cigna, Medicare, Medicaid, Kaiser', true, 5, 'active'),

-- Chain pharmacies
('Walgreens Pharmacy', '1333 Castro St, San Francisco, CA 94114', '+1 (415) 555-0204', 'castro@walgreens.com', 'Mon-Fri: 8am-10pm, Sat-Sun: 9am-9pm', 'Prescription filling, Immunizations, Health screenings, Photo services, Beauty products, 24-hour ATM', 'All major insurance plans accepted', true, 10, 'active'),
('CVS Pharmacy', '731 Market St, San Francisco, CA 94103', '+1 (415) 555-0205', 'market@cvs.com', 'Mon-Sun: 24 hours', 'Prescription filling, MinuteClinic, Immunizations, Health screenings, Photo services, Beauty products', 'All major insurance plans accepted', true, 15, 'active'),
('Rite Aid Pharmacy', '776 Haight St, San Francisco, CA 94117', '+1 (415) 555-0206', 'haight@riteaid.com', 'Mon-Fri: 8am-10pm, Sat-Sun: 9am-9pm', 'Prescription filling, Immunizations, Health screenings, Photo services, Beauty products', 'All major insurance plans accepted', true, 8, 'active'),

-- Specialty pharmacies
('Oncology Pharmacy Specialists', '350 Parnassus Ave, San Francisco, CA 94117', '+1 (415) 555-0207', 'info@oncologyrx.com', 'Mon-Fri: 9am-6pm', 'Specialty oncology medications, Chemotherapy, Supportive care medications, Patient education, Financial assistance', 'All major insurance plans, Medicare Part D, Medicaid, Specialized oncology coverage', true, 25, 'active'),
('Fertility Pharmacy Solutions', '2100 Webster St, San Francisco, CA 94115', '+1 (415) 555-0208', 'info@fertilityrx.com', 'Mon-Fri: 8am-7pm, Sat: 9am-3pm', 'Fertility medications, Injection training, Medication coordination, Discreet packaging, 24/7 clinical support', 'Most major insurance plans, Specialized fertility coverage', true, 30, 'active'),
('Transplant Pharmacy Care', '505 Parnassus Ave, San Francisco, CA 94143', '+1 (415) 555-0209', 'info@transplantpharmacy.com', 'Mon-Fri: 8am-6pm', 'Transplant medications, Immunosuppressants, Medication therapy management, Patient education, Financial assistance', 'All major insurance plans, Medicare, Medicaid, Specialized transplant coverage', true, 20, 'active'),

-- Hospital pharmacies
('UCSF Medical Center Pharmacy', '505 Parnassus Ave, San Francisco, CA 94143', '+1 (415) 555-0210', 'pharmacy@ucsfmedctr.org', 'Mon-Sun: 24 hours', 'Inpatient and outpatient prescriptions, Specialty medications, Medication counseling, Clinical pharmacy services', 'All major insurance plans, Medicare, Medicaid', false, null, 'active'),
('SF General Hospital Pharmacy', '1001 Potrero Ave, San Francisco, CA 94110', '+1 (415) 555-0211', 'pharmacy@sfgeneral.org', 'Mon-Fri: 8am-8pm, Sat-Sun: 9am-5pm', 'Outpatient prescriptions, Medication assistance programs, Medication counseling, Specialty medications', 'All major insurance plans, Medicare, Medicaid, Healthy SF', false, null, 'active');