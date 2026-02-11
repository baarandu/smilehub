-- Voice Consultation Sessions table
-- Stores voice consultation sessions where AI transcribes and extracts structured data

CREATE TABLE IF NOT EXISTS voice_consultation_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id uuid NOT NULL REFERENCES clinics(id),
    user_id uuid NOT NULL REFERENCES profiles(id),
    appointment_id uuid REFERENCES appointments(id),
    patient_id uuid REFERENCES patients(id),
    status text NOT NULL DEFAULT 'recording'
        CHECK (status IN ('recording','processing','review','completed','discarded')),
    is_new_patient boolean NOT NULL DEFAULT false,
    consent_given boolean NOT NULL DEFAULT false,
    consent_given_at timestamptz,
    audio_duration_seconds integer,
    transcription text,
    extracted_patient_data jsonb,
    extracted_anamnesis_data jsonb,
    extracted_consultation_data jsonb,
    saved_patient_id uuid REFERENCES patients(id),
    saved_anamnesis_id uuid REFERENCES anamneses(id),
    saved_consultation_id uuid REFERENCES consultations(id),
    processing_started_at timestamptz,
    processing_completed_at timestamptz,
    processing_error text,
    whisper_tokens_used integer DEFAULT 0,
    gpt_tokens_used integer DEFAULT 0,
    estimated_cost_usd numeric(10,4) DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voice_consultation_sessions_clinic_id
    ON voice_consultation_sessions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_voice_consultation_sessions_user_id
    ON voice_consultation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_consultation_sessions_patient_id
    ON voice_consultation_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_voice_consultation_sessions_status
    ON voice_consultation_sessions(status);

-- RLS
ALTER TABLE voice_consultation_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view voice consultation sessions from their clinic" ON voice_consultation_sessions;
CREATE POLICY "Users can view voice consultation sessions from their clinic"
    ON voice_consultation_sessions FOR SELECT
    USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert voice consultation sessions for their clinic" ON voice_consultation_sessions;
CREATE POLICY "Users can insert voice consultation sessions for their clinic"
    ON voice_consultation_sessions FOR INSERT
    WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update voice consultation sessions from their clinic" ON voice_consultation_sessions;
CREATE POLICY "Users can update voice consultation sessions from their clinic"
    ON voice_consultation_sessions FOR UPDATE
    USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete voice consultation sessions from their clinic" ON voice_consultation_sessions;
CREATE POLICY "Users can delete voice consultation sessions from their clinic"
    ON voice_consultation_sessions FOR DELETE
    USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid()
        )
    );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_voice_consultation_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS voice_consultation_sessions_updated_at ON voice_consultation_sessions;
CREATE TRIGGER voice_consultation_sessions_updated_at
    BEFORE UPDATE ON voice_consultation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_voice_consultation_sessions_updated_at();

COMMENT ON TABLE voice_consultation_sessions IS 'Voice consultation sessions with AI transcription and data extraction';
