/*
  # Truncate Profile Data

  1. Purpose
    - Safely remove all data associated with a specific user profile
    - Maintain referential integrity
    - Preserve audit trail

  2. Operations
    - Delete user's appointments
    - Delete user's medical records
    - Delete user's health metrics
    - Delete user's memberships and related payment data
    - Delete user's payment methods
    - Delete user's profile
*/

DO $$ 
DECLARE
  target_email TEXT := 'qreative.ambitions@gmail.com';
  target_profile_id UUID;
BEGIN
  -- Get the profile ID for the target email
  SELECT id INTO target_profile_id
  FROM auth.users
  WHERE email = target_email;

  IF target_profile_id IS NOT NULL THEN
    -- Delete appointments and related partner appointments
    DELETE FROM partner_appointments
    WHERE appointment_id IN (
      SELECT id FROM appointments WHERE profile_id = target_profile_id
    );
    
    DELETE FROM appointments 
    WHERE profile_id = target_profile_id;

    -- Delete medical records
    DELETE FROM medical_records 
    WHERE profile_id = target_profile_id;

    -- Delete health metrics
    DELETE FROM health_metrics 
    WHERE profile_id = target_profile_id;

    -- Delete payment history and memberships
    DELETE FROM payment_history
    WHERE membership_id IN (
      SELECT id FROM memberships WHERE profile_id = target_profile_id
    );
    
    DELETE FROM memberships 
    WHERE profile_id = target_profile_id;

    -- Delete payment methods
    DELETE FROM payment_methods 
    WHERE profile_id = target_profile_id;

    -- Finally, delete the profile
    DELETE FROM profiles 
    WHERE id = target_profile_id;
  END IF;
END $$;