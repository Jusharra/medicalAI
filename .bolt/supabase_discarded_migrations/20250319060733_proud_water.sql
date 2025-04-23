/*
  # Remove All Test Accounts and Profiles
  
  1. Purpose
    - Clean up all test data from the database
    - Remove all test accounts and associated profiles
    - Ensure clean state for production
    
  2. Changes
    - Delete all data from dependent tables first
    - Remove all test accounts from auth.users
    - Remove all test identities
*/

-- First delete from dependent tables to maintain referential integrity
DELETE FROM memberships;
DELETE FROM health_metrics;
DELETE FROM medical_records;
DELETE FROM appointments;
DELETE FROM profiles;

-- Delete all identities
DELETE FROM auth.identities;

-- Delete all sessions and refresh tokens
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.sessions;

-- Finally delete all users
DELETE FROM auth.users;

-- Verify tables are empty
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM auth.users) = 0, 'auth.users table is not empty';
  ASSERT (SELECT COUNT(*) FROM auth.identities) = 0, 'auth.identities table is not empty';
  ASSERT (SELECT COUNT(*) FROM profiles) = 0, 'profiles table is not empty';
  ASSERT (SELECT COUNT(*) FROM memberships) = 0, 'memberships table is not empty';
END $$;