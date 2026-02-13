-- Digital Signatures table for SuperSign integration
CREATE TABLE IF NOT EXISTS digital_signatures (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- SuperSign
    envelope_id text UNIQUE,
    title text NOT NULL,
    status text NOT NULL DEFAULT 'PENDING_UPLOAD'
        CHECK (status IN ('PENDING_UPLOAD','DRAFT','PROCESSING','SENT','SEALING','COMPLETED','EXPIRED','VOIDED','ERROR')),

    -- Documents
    document_template_id uuid REFERENCES document_templates(id) ON DELETE SET NULL,
    original_pdf_url text,
    signed_pdf_url text,
    exam_id uuid REFERENCES exams(id) ON DELETE SET NULL,

    -- Signatories (denormalized — always 1-2 with fixed roles)
    dentist_signatory_id text,
    dentist_status text DEFAULT 'PENDING',
    dentist_signature_token text,
    patient_signatory_id text,
    patient_status text,
    patient_delivery_method text CHECK (patient_delivery_method IN ('EMAIL','WHATSAPP')),

    -- Meta
    deadline timestamptz,
    error_message text,
    supersign_data jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    completed_at timestamptz
);

-- Indexes
CREATE INDEX idx_digital_signatures_clinic ON digital_signatures(clinic_id);
CREATE INDEX idx_digital_signatures_patient ON digital_signatures(patient_id);
CREATE INDEX idx_digital_signatures_status ON digital_signatures(status);
CREATE INDEX idx_digital_signatures_envelope ON digital_signatures(envelope_id);
CREATE INDEX idx_digital_signatures_created ON digital_signatures(created_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_digital_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_digital_signatures_updated_at
    BEFORE UPDATE ON digital_signatures
    FOR EACH ROW
    EXECUTE FUNCTION update_digital_signatures_updated_at();

-- RLS
ALTER TABLE digital_signatures ENABLE ROW LEVEL SECURITY;

-- Users from the same clinic can SELECT
CREATE POLICY "digital_signatures_select" ON digital_signatures
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
        )
    );

-- Dentists/admins from the same clinic can INSERT
CREATE POLICY "digital_signatures_insert" ON digital_signatures
    FOR INSERT WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
        )
    );

-- Dentists/admins from the same clinic can UPDATE
CREATE POLICY "digital_signatures_update" ON digital_signatures
    FOR UPDATE USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
        )
    );
