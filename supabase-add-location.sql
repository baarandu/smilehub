-- Add location field to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- Comment for documentation
COMMENT ON COLUMN appointments.location IS 'Local de atendimento da consulta';


