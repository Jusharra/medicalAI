/*
  # Clear all accounts from database
  
  This migration removes all user data to allow testing fresh signups.
  
  1. Changes
    - Removes all data from:
      - chat_messages
      - partner_appointments
      - appointments
      - medical_records
      - health_metrics
      - payment_history
      - memberships
      - payment_methods
      - profiles
      - stripe_customers
      - pharmacies
*/

-- Delete all data from dependent tables first
DELETE FROM chat_messages;
DELETE FROM partner_appointments;
DELETE FROM appointments;
DELETE FROM medical_records;
DELETE FROM health_metrics;
DELETE FROM payment_history;
DELETE FROM memberships;
DELETE FROM payment_methods;
DELETE FROM profiles;
DELETE FROM stripe_customers;
DELETE FROM pharmacies;

-- Delete all users from auth schema
DELETE FROM auth.users;