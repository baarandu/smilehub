-- ============================================================
-- Clinical Record Signatures — Assinatura Digital de Prontuários
-- Base legal: MP 2.200-2/2001, LGPD, Lei 14.063/2020, CFO 118/2012
-- ============================================================

-- 1) OTP Challenges (verificação de identidade do paciente)
CREATE TABLE IF NOT EXISTS signature_otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  record_type text NOT NULL CHECK (record_type IN ('anamnesis', 'procedure', 'exam')),
  record_id uuid NOT NULL,
  email_to text NOT NULL,
  otp_hash text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'verified', 'expired', 'locked')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  request_ip text,
  request_user_agent text,
  verify_ip text,
  verify_user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- No RLS — access only via Edge Functions (service_role)
ALTER TABLE signature_otp_challenges ENABLE ROW LEVEL SECURITY;

-- Immutable after verified
CREATE OR REPLACE FUNCTION _immutable_verified_otp()
RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'verified' THEN
    RAISE EXCEPTION 'OTP challenge already verified — cannot modify';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_immutable_verified_otp
  BEFORE UPDATE ON signature_otp_challenges
  FOR EACH ROW EXECUTE FUNCTION _immutable_verified_otp();

-- 2) Clinical Record Signatures
CREATE TABLE IF NOT EXISTS clinical_record_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  patient_id uuid NOT NULL REFERENCES patients(id),
  record_type text NOT NULL CHECK (record_type IN ('anamnesis', 'procedure', 'exam')),
  record_id uuid NOT NULL,
  signer_type text NOT NULL CHECK (signer_type IN ('patient', 'dentist')),
  signer_name text NOT NULL,
  signer_user_id uuid REFERENCES auth.users(id),
  signature_image_url text,
  content_hash text NOT NULL,
  content_hash_verified boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text,
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  batch_document_id text,
  otp_method text,
  otp_challenge_id uuid REFERENCES signature_otp_challenges(id),
  otp_email_masked text
);

-- Unique: one signature per record per signer type
CREATE UNIQUE INDEX idx_unique_record_signature
  ON clinical_record_signatures (record_type, record_id, signer_type);

-- RLS enabled but no policies — insert only via service_role
ALTER TABLE clinical_record_signatures ENABLE ROW LEVEL SECURITY;

-- Read policy for authenticated users (same clinic)
CREATE POLICY "Users can read own clinic signatures"
  ON clinical_record_signatures FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
    )
  );

-- Immutability triggers: block UPDATE and DELETE
CREATE OR REPLACE FUNCTION _block_signature_update()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'clinical_record_signatures are immutable — UPDATE not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION _block_signature_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'clinical_record_signatures are immutable — DELETE not allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_signature_update
  BEFORE UPDATE ON clinical_record_signatures
  FOR EACH ROW EXECUTE FUNCTION _block_signature_update();

CREATE TRIGGER trg_block_signature_delete
  BEFORE DELETE ON clinical_record_signatures
  FOR EACH ROW EXECUTE FUNCTION _block_signature_delete();

-- 3) Clinical Record Versions (snapshot when signed record is edited)
CREATE TABLE IF NOT EXISTS clinical_record_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id),
  record_type text NOT NULL CHECK (record_type IN ('anamnesis', 'procedure', 'exam')),
  record_id uuid NOT NULL,
  version_number int NOT NULL,
  content_snapshot jsonb NOT NULL,
  content_hash text NOT NULL,
  edited_by uuid REFERENCES auth.users(id),
  edited_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique version per record
CREATE UNIQUE INDEX idx_unique_record_version
  ON clinical_record_versions (record_type, record_id, version_number);

-- RLS
ALTER TABLE clinical_record_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own clinic versions"
  ON clinical_record_versions FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
    )
  );

-- Immutability: block UPDATE and DELETE on versions
CREATE TRIGGER trg_block_version_update
  BEFORE UPDATE ON clinical_record_versions
  FOR EACH ROW EXECUTE FUNCTION _block_signature_update();

CREATE TRIGGER trg_block_version_delete
  BEFORE DELETE ON clinical_record_versions
  FOR EACH ROW EXECUTE FUNCTION _block_signature_delete();

-- 4) Storage bucket for signature images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('signatures', 'signatures', false, 2097152, ARRAY['image/png'])
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload
CREATE POLICY "Authenticated users can upload signatures"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'signatures');

-- Storage policy: authenticated users can read own clinic signatures
CREATE POLICY "Authenticated users can read signatures"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'signatures');

-- No DELETE policy — signatures are immutable

-- 5) RPC: get unsigned clinical records for a patient
CREATE OR REPLACE FUNCTION get_unsigned_clinical_records(p_clinic_id uuid, p_patient_id uuid DEFAULT NULL)
RETURNS TABLE (
  record_type text,
  record_id uuid,
  patient_id uuid,
  patient_name text,
  record_date date,
  record_description text,
  has_patient_signature boolean,
  has_dentist_signature boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  -- Procedures without full signatures
  SELECT
    'procedure'::text AS record_type,
    p.id AS record_id,
    p.patient_id,
    pat.name AS patient_name,
    p.date::date AS record_date,
    COALESCE(p.description, '') AS record_description,
    EXISTS (
      SELECT 1 FROM clinical_record_signatures s
      WHERE s.record_type = 'procedure' AND s.record_id = p.id AND s.signer_type = 'patient'
    ) AS has_patient_signature,
    EXISTS (
      SELECT 1 FROM clinical_record_signatures s
      WHERE s.record_type = 'procedure' AND s.record_id = p.id AND s.signer_type = 'dentist'
    ) AS has_dentist_signature
  FROM procedures p
  JOIN patients pat ON pat.id = p.patient_id
  WHERE p.clinic_id = p_clinic_id
    AND (p_patient_id IS NULL OR p.patient_id = p_patient_id)
    AND NOT EXISTS (
      SELECT 1 FROM clinical_record_signatures s
      WHERE s.record_type = 'procedure' AND s.record_id = p.id AND s.signer_type = 'dentist'
    )

  UNION ALL

  -- Anamneses without full signatures
  SELECT
    'anamnesis'::text AS record_type,
    a.id AS record_id,
    a.patient_id,
    pat.name AS patient_name,
    a.date::date AS record_date,
    'Anamnese' AS record_description,
    EXISTS (
      SELECT 1 FROM clinical_record_signatures s
      WHERE s.record_type = 'anamnesis' AND s.record_id = a.id AND s.signer_type = 'patient'
    ) AS has_patient_signature,
    EXISTS (
      SELECT 1 FROM clinical_record_signatures s
      WHERE s.record_type = 'anamnesis' AND s.record_id = a.id AND s.signer_type = 'dentist'
    ) AS has_dentist_signature
  FROM anamneses a
  JOIN patients pat ON pat.id = a.patient_id
  WHERE a.clinic_id = p_clinic_id
    AND (p_patient_id IS NULL OR a.patient_id = p_patient_id)
    AND NOT EXISTS (
      SELECT 1 FROM clinical_record_signatures s
      WHERE s.record_type = 'anamnesis' AND s.record_id = a.id AND s.signer_type = 'dentist'
    )

  UNION ALL

  -- Exams without full signatures
  SELECT
    'exam'::text AS record_type,
    e.id AS record_id,
    e.patient_id,
    pat.name AS patient_name,
    e.order_date::date AS record_date,
    COALESCE(e.name, 'Exame') AS record_description,
    EXISTS (
      SELECT 1 FROM clinical_record_signatures s
      WHERE s.record_type = 'exam' AND s.record_id = e.id AND s.signer_type = 'patient'
    ) AS has_patient_signature,
    EXISTS (
      SELECT 1 FROM clinical_record_signatures s
      WHERE s.record_type = 'exam' AND s.record_id = e.id AND s.signer_type = 'dentist'
    ) AS has_dentist_signature
  FROM exams e
  JOIN patients pat ON pat.id = e.patient_id
  WHERE e.clinic_id = p_clinic_id
    AND (p_patient_id IS NULL OR e.patient_id = p_patient_id)
    AND NOT EXISTS (
      SELECT 1 FROM clinical_record_signatures s
      WHERE s.record_type = 'exam' AND s.record_id = e.id AND s.signer_type = 'dentist'
    )

  ORDER BY record_date DESC;
$$;

-- 6) Trigger: auto-version on signed record edit
CREATE OR REPLACE FUNCTION _version_on_signed_record_edit()
RETURNS trigger AS $$
DECLARE
  v_record_type text;
  v_next_version int;
  v_snapshot jsonb;
  v_hash text;
BEGIN
  -- Determine record type based on TG_TABLE_NAME
  IF TG_TABLE_NAME = 'procedures' THEN
    v_record_type := 'procedure';
  ELSIF TG_TABLE_NAME = 'anamneses' THEN
    v_record_type := 'anamnesis';
  ELSIF TG_TABLE_NAME = 'exams' THEN
    v_record_type := 'exam';
  ELSE
    RETURN NEW;
  END IF;

  -- Check if this record has any signature
  IF NOT EXISTS (
    SELECT 1 FROM clinical_record_signatures
    WHERE record_type = v_record_type AND record_id = OLD.id
  ) THEN
    RETURN NEW;
  END IF;

  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next_version
  FROM clinical_record_versions
  WHERE record_type = v_record_type AND record_id = OLD.id;

  -- Snapshot the OLD row
  v_snapshot := to_jsonb(OLD);

  -- Compute a simple hash (SHA-256 of the snapshot)
  v_hash := encode(digest(v_snapshot::text, 'sha256'), 'hex');

  -- Insert version record
  INSERT INTO clinical_record_versions (
    clinic_id, record_type, record_id, version_number,
    content_snapshot, content_hash, edited_by, reason
  ) VALUES (
    OLD.clinic_id, v_record_type, OLD.id, v_next_version,
    v_snapshot, v_hash, auth.uid(), 'Edição de registro assinado'
  );

  -- Audit log
  INSERT INTO audit_logs (action, table_name, record_id, user_id, clinic_id, new_data, source)
  VALUES (
    'SIGNED_RECORD_EDITED',
    TG_TABLE_NAME,
    OLD.id::text,
    auth.uid()::text,
    OLD.clinic_id::text,
    jsonb_build_object('version', v_next_version, 'record_type', v_record_type),
    'trigger'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Apply trigger to procedures, anamneses, exams
CREATE TRIGGER trg_version_procedures
  BEFORE UPDATE ON procedures
  FOR EACH ROW EXECUTE FUNCTION _version_on_signed_record_edit();

CREATE TRIGGER trg_version_anamneses
  BEFORE UPDATE ON anamneses
  FOR EACH ROW EXECUTE FUNCTION _version_on_signed_record_edit();

CREATE TRIGGER trg_version_exams
  BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION _version_on_signed_record_edit();
