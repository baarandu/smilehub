-- Migration: Switch dentist references from clinic_professionals to auth.users
-- appointments.dentist_id and schedule_settings.professional_id now reference auth.users(id)
-- This aligns with orthodontics/prosthesis which already use auth.users.id as dentist_id

-- 1. Migrate appointments.dentist_id: clinic_professionals.id → clinic_professionals.user_id
UPDATE appointments a
SET dentist_id = cp.user_id
FROM clinic_professionals cp
WHERE a.dentist_id = cp.id
  AND cp.user_id IS NOT NULL;

-- Clear orphan references (clinic_professionals without user_id)
UPDATE appointments a
SET dentist_id = NULL
FROM clinic_professionals cp
WHERE a.dentist_id = cp.id
  AND cp.user_id IS NULL;

-- 2. Migrate schedule_settings.professional_id: clinic_professionals.id → clinic_professionals.user_id
-- First, drop NOT NULL so we can handle orphans
ALTER TABLE schedule_settings ALTER COLUMN professional_id DROP NOT NULL;

-- Migrate data
UPDATE schedule_settings ss
SET professional_id = cp.user_id
FROM clinic_professionals cp
WHERE ss.professional_id = cp.id
  AND cp.user_id IS NOT NULL;

-- Delete orphan schedule_settings (professional without user_id)
DELETE FROM schedule_settings ss
WHERE ss.professional_id IN (
  SELECT id FROM clinic_professionals WHERE user_id IS NULL
);

-- 3. Drop old FK constraints
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_dentist_id_fkey;
ALTER TABLE schedule_settings DROP CONSTRAINT IF EXISTS schedule_settings_professional_id_fkey;

-- 4. Add new FK constraints referencing auth.users
ALTER TABLE appointments
  ADD CONSTRAINT appointments_dentist_id_fkey
  FOREIGN KEY (dentist_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE schedule_settings
  ADD CONSTRAINT schedule_settings_professional_id_fkey
  FOREIGN KEY (professional_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Restore NOT NULL on schedule_settings.professional_id
-- (all rows now have valid auth.users references)
ALTER TABLE schedule_settings ALTER COLUMN professional_id SET NOT NULL;
