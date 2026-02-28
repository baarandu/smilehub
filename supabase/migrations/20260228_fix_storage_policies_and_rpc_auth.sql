-- Fix #4: Signatures bucket - add clinic_id filter to storage policies
-- Current policies allow any authenticated user to read/write any clinic's signatures.
-- The file path pattern is: {clinic_id}/{patient_id}/...

DROP POLICY IF EXISTS "Authenticated users can upload signatures" ON storage.objects;
CREATE POLICY "Clinic members can upload signatures"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'signatures' AND
    (storage.foldername(name))[1] IN (
      SELECT clinic_id::text FROM public.clinic_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can read signatures" ON storage.objects;
CREATE POLICY "Clinic members can read signatures"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'signatures' AND
    (storage.foldername(name))[1] IN (
      SELECT clinic_id::text FROM public.clinic_users WHERE user_id = auth.uid()
    )
  );

-- Fix #5: Make fiscal-documents bucket private
-- Currently public: true, meaning getPublicUrl bypasses RLS.
UPDATE storage.buckets SET public = false WHERE id = 'fiscal-documents';

-- Fix #6: Add auth check to get_unsigned_clinical_records SECURITY DEFINER function
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
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller belongs to the clinic
  IF NOT EXISTS (
    SELECT 1 FROM public.clinic_users
    WHERE user_id = auth.uid() AND clinic_id = p_clinic_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: user does not belong to clinic';
  END IF;

  RETURN QUERY
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
    'anamnesis'::text,
    a.id,
    a.patient_id,
    pat.name,
    a.created_at::date,
    '',
    EXISTS (
      SELECT 1 FROM clinical_record_signatures s
      WHERE s.record_type = 'anamnesis' AND s.record_id = a.id AND s.signer_type = 'patient'
    ),
    EXISTS (
      SELECT 1 FROM clinical_record_signatures s
      WHERE s.record_type = 'anamnesis' AND s.record_id = a.id AND s.signer_type = 'dentist'
    )
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
    'exam'::text,
    e.id,
    e.patient_id,
    pat.name,
    e.order_date::date,
    COALESCE(e.name, ''),
    EXISTS (
      SELECT 1 FROM clinical_record_signatures s
      WHERE s.record_type = 'exam' AND s.record_id = e.id AND s.signer_type = 'patient'
    ),
    EXISTS (
      SELECT 1 FROM clinical_record_signatures s
      WHERE s.record_type = 'exam' AND s.record_id = e.id AND s.signer_type = 'dentist'
    )
  FROM exams e
  JOIN patients pat ON pat.id = e.patient_id
  WHERE e.clinic_id = p_clinic_id
    AND (p_patient_id IS NULL OR e.patient_id = p_patient_id)
    AND NOT EXISTS (
      SELECT 1 FROM clinical_record_signatures s
      WHERE s.record_type = 'exam' AND s.record_id = e.id AND s.signer_type = 'dentist'
    )

  ORDER BY record_date DESC;
END;
$$;
