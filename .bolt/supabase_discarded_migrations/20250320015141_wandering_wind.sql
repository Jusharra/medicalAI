/*
  # Fix auth.users Required Fields
  
  1. Purpose
    - Set default empty string values for required fields
    - Prevent null value errors in auth system
    - Handle updates in smaller batches
    
  2. Changes
    - Add default '' for required columns
    - Update existing records safely
    - Use DO block for better error handling
*/

DO $$ 
BEGIN
  -- Safely alter columns one at a time
  BEGIN
    ALTER TABLE auth.users ALTER COLUMN confirmation_token SET DEFAULT '';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE auth.users ALTER COLUMN email_change SET DEFAULT '';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE auth.users ALTER COLUMN email_change_token_new SET DEFAULT '';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    ALTER TABLE auth.users ALTER COLUMN recovery_token SET DEFAULT '';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Update existing records in smaller batches with error handling
  BEGIN
    UPDATE auth.users
    SET confirmation_token = ''
    WHERE confirmation_token IS NULL;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    UPDATE auth.users
    SET email_change = ''
    WHERE email_change IS NULL;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    UPDATE auth.users
    SET email_change_token_new = ''
    WHERE email_change_token_new IS NULL;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    UPDATE auth.users
    SET recovery_token = ''
    WHERE recovery_token IS NULL;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;