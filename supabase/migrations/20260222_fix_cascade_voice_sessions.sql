-- Fix voice_consultation_sessions FK to CASCADE on patient delete
ALTER TABLE voice_consultation_sessions
  DROP CONSTRAINT IF EXISTS voice_consultation_sessions_patient_id_fkey,
  ADD CONSTRAINT voice_consultation_sessions_patient_id_fkey
  FOREIGN KEY (patient_id)
  REFERENCES patients(id)
  ON DELETE CASCADE;

ALTER TABLE voice_consultation_sessions
  DROP CONSTRAINT IF EXISTS voice_consultation_sessions_saved_patient_id_fkey,
  ADD CONSTRAINT voice_consultation_sessions_saved_patient_id_fkey
  FOREIGN KEY (saved_patient_id)
  REFERENCES patients(id)
  ON DELETE CASCADE;
