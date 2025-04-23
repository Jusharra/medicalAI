/*
  # Consolidate Appointments and Bookings Tables

  1. Changes
    - Drop bookings table to avoid duplication
    - Add missing indexes to appointments table
    - Add delete policy to appointments
*/

-- Drop bookings table if it exists
DROP TABLE IF EXISTS bookings CASCADE;

-- Add any missing indexes to appointments table
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_updated_at ON appointments(updated_at DESC);

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "appointments_delete_own" ON appointments;

-- Create delete policy for appointments
CREATE POLICY "appointments_delete_own"
  ON appointments
  FOR DELETE
  TO authenticated
  USING (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM care_team_members
      WHERE care_team_members.partner_id = auth.uid()
      AND care_team_members.profile_id = appointments.profile_id
    ) OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );