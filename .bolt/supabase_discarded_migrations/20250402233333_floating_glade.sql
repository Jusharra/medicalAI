/*
  # Fix Appointments and Partners Relationship

  1. Changes
    - Add partner_id column to appointments table
    - Create foreign key relationship between appointments and partners
    - Update existing queries to use the correct relationship

  2. Security
    - No changes to RLS policies needed
*/

-- Add partner_id column to appointments table if it doesn't exist
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES partners(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_partner_id ON appointments(partner_id);

-- Update the AppointmentBooking component to store partner_id when creating appointments
COMMENT ON COLUMN appointments.partner_id IS 'Reference to the healthcare provider (partner) for this appointment';