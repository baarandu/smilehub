-- Schedule Settings per dentist + dentist_id on appointments

-- 1. Create schedule_settings table
CREATE TABLE IF NOT EXISTS schedule_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES clinic_professionals(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=dom, 1=seg...6=sab
  start_time time NOT NULL,
  end_time time NOT NULL,
  interval_minutes int NOT NULL DEFAULT 30,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  location_ids text, -- comma-separated location IDs for multi-location slots
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
  -- Multiple slots per day allowed (e.g. 7h-9h and 12h-14h)
);

-- 2. Add dentist_id to appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS dentist_id uuid REFERENCES clinic_professionals(id) ON DELETE SET NULL;

-- 3. RLS for schedule_settings
ALTER TABLE schedule_settings ENABLE ROW LEVEL SECURITY;

-- Members can read
CREATE POLICY "schedule_settings_select" ON schedule_settings
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())
  );

-- Admin/dentist can insert
CREATE POLICY "schedule_settings_insert" ON schedule_settings
  FOR INSERT WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM clinic_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
    )
  );

-- Admin/dentist can update
CREATE POLICY "schedule_settings_update" ON schedule_settings
  FOR UPDATE USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
    )
  );

-- Admin/dentist can delete
CREATE POLICY "schedule_settings_delete" ON schedule_settings
  FOR DELETE USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
    )
  );
