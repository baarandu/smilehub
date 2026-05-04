-- Add N-week cycle support to schedule_settings (e.g. biweekly schedules where
-- a dentist works Mon/Wed/Sat one week and Tue/Thu/Fri the next).
--
-- Backward compatible: defaults week_index=0, cycle_length=1, which means
-- "every week is the same" — identical to the previous behavior.

-- 1. Add cycle columns to schedule_settings
ALTER TABLE schedule_settings
  ADD COLUMN IF NOT EXISTS week_index int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cycle_length int NOT NULL DEFAULT 1;

ALTER TABLE schedule_settings
  DROP CONSTRAINT IF EXISTS schedule_settings_cycle_chk;

ALTER TABLE schedule_settings
  ADD CONSTRAINT schedule_settings_cycle_chk
  CHECK (
    cycle_length BETWEEN 1 AND 8
    AND week_index >= 0
    AND week_index < cycle_length
  );

-- Index covering the typical lookup: "active rows for this dentist on this
-- weekday and this week of the cycle"
CREATE INDEX IF NOT EXISTS idx_schedule_settings_pro_day_week
  ON schedule_settings (clinic_id, professional_id, day_of_week, week_index)
  WHERE is_active;

-- 2. Per-(clinic, professional) cycle metadata. Sparse: rows only exist when
-- the dentist actually uses a cycle longer than 1 week. Absent row = weekly.
CREATE TABLE IF NOT EXISTS professional_schedule_cycle (
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_start_date date NOT NULL,
  cycle_length int NOT NULL DEFAULT 1 CHECK (cycle_length BETWEEN 1 AND 8),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clinic_id, professional_id)
);

ALTER TABLE professional_schedule_cycle ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "professional_schedule_cycle_select" ON professional_schedule_cycle;
CREATE POLICY "professional_schedule_cycle_select" ON professional_schedule_cycle
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "professional_schedule_cycle_insert" ON professional_schedule_cycle;
CREATE POLICY "professional_schedule_cycle_insert" ON professional_schedule_cycle
  FOR INSERT WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM clinic_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
    )
  );

DROP POLICY IF EXISTS "professional_schedule_cycle_update" ON professional_schedule_cycle;
CREATE POLICY "professional_schedule_cycle_update" ON professional_schedule_cycle
  FOR UPDATE USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
    )
  );

DROP POLICY IF EXISTS "professional_schedule_cycle_delete" ON professional_schedule_cycle;
CREATE POLICY "professional_schedule_cycle_delete" ON professional_schedule_cycle
  FOR DELETE USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_professional_schedule_cycle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_professional_schedule_cycle_updated_at ON professional_schedule_cycle;
CREATE TRIGGER trg_professional_schedule_cycle_updated_at
  BEFORE UPDATE ON professional_schedule_cycle
  FOR EACH ROW
  EXECUTE FUNCTION set_professional_schedule_cycle_updated_at();
