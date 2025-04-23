/*
  # Add Stripe Payment Link to Services Table
  
  1. Purpose
    - Add stripe_payment_link field to services table
    - Store Stripe payment link for each service
    
  2. Changes
    - Add new column for payment link
    - Update existing services with sample payment links
*/

-- Add stripe_payment_link column to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS stripe_payment_link text;

-- Update existing services with the test payment link
UPDATE services 
SET stripe_payment_link = 'https://buy.stripe.com/test_6oE1822fN2xxfQs288'
WHERE stripe_payment_link IS NULL;