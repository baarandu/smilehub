-- Add return alert columns to patients table
ALTER TABLE patients 
ADD COLUMN IF NOT EXISTS return_alert_flag BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS return_alert_date DATE DEFAULT NULL;

-- Comment on columns
COMMENT ON COLUMN patients.return_alert_flag IS 'Flag to indicate if an important return alert is active';
COMMENT ON COLUMN patients.return_alert_date IS 'Target date for the return alert';
