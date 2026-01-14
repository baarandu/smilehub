-- =====================================================
-- AI Secretary Schedule Table
-- Allows different hours per day and per location
-- Execute this in your Supabase SQL Editor
-- =====================================================

-- Schedule entries: each row is a time slot
CREATE TABLE IF NOT EXISTS ai_secretary_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    
    -- Day of week (0 = Sunday, 1 = Monday, ... 6 = Saturday)
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    
    -- Location (optional - null means all locations)
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    
    -- Time range
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Is this slot active?
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure end_time > start_time
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    
    -- Prevent duplicate entries for same day/location/time
    UNIQUE(clinic_id, day_of_week, location_id, start_time, end_time)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_ai_schedule_clinic ON ai_secretary_schedule(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ai_schedule_day ON ai_secretary_schedule(day_of_week);
CREATE INDEX IF NOT EXISTS idx_ai_schedule_location ON ai_secretary_schedule(location_id);

-- RLS
ALTER TABLE ai_secretary_schedule ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (for idempotent execution)
DROP POLICY IF EXISTS "Users can view their clinic schedule" ON ai_secretary_schedule;
DROP POLICY IF EXISTS "Admins can manage schedule" ON ai_secretary_schedule;

-- View policy
CREATE POLICY "Users can view their clinic schedule"
    ON ai_secretary_schedule FOR SELECT
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

-- Manage policy (admins/managers)
CREATE POLICY "Admins can manage schedule"
    ON ai_secretary_schedule FOR ALL
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid() AND role IN ('admin', 'manager', 'owner')));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_ai_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ai_schedule_updated_at ON ai_secretary_schedule;

CREATE TRIGGER trigger_ai_schedule_updated_at
    BEFORE UPDATE ON ai_secretary_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_schedule_updated_at();

-- =====================================================
-- Update ai_secretary_settings to remove old fields
-- (They are now in the schedule table)
-- =====================================================

-- Remove old columns if they exist (optional - run if you want to clean up)
-- ALTER TABLE ai_secretary_settings DROP COLUMN IF EXISTS work_hours_start;
-- ALTER TABLE ai_secretary_settings DROP COLUMN IF EXISTS work_hours_end;
-- ALTER TABLE ai_secretary_settings DROP COLUMN IF EXISTS work_days;
