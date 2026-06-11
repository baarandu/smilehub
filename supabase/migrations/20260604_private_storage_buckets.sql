-- Harden storage buckets after pentest findings #2 and #12.
-- Buckets are private; object access is scoped by the first path segment (clinic_id).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinic-logos',
  'clinic-logos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET public = false;

UPDATE storage.buckets
SET public = false
WHERE id IN ('exams', 'clinic-logos');

DROP POLICY IF EXISTS "Clinic members can upload exams" ON storage.objects;
DROP POLICY IF EXISTS "Clinic members can view exams" ON storage.objects;
DROP POLICY IF EXISTS "Clinic members can delete exams" ON storage.objects;
DROP POLICY IF EXISTS "Clinic members can update exams" ON storage.objects;

CREATE POLICY "Clinic members can view exams"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'exams'
    AND (storage.foldername(name))[1] IN (
      SELECT cu.clinic_id::text FROM public.clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Clinic members can upload exams"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'exams'
    AND (storage.foldername(name))[1] IN (
      SELECT cu.clinic_id::text FROM public.clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Clinic members can update exams"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'exams'
    AND (storage.foldername(name))[1] IN (
      SELECT cu.clinic_id::text FROM public.clinic_users cu WHERE cu.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'exams'
    AND (storage.foldername(name))[1] IN (
      SELECT cu.clinic_id::text FROM public.clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Clinic members can delete exams"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'exams'
    AND (storage.foldername(name))[1] IN (
      SELECT cu.clinic_id::text FROM public.clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clinic members can view clinic logos" ON storage.objects;
DROP POLICY IF EXISTS "Clinic members can upload clinic logos" ON storage.objects;
DROP POLICY IF EXISTS "Clinic members can update clinic logos" ON storage.objects;
DROP POLICY IF EXISTS "Clinic members can delete clinic logos" ON storage.objects;

CREATE POLICY "Clinic members can view clinic logos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'clinic-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT cu.clinic_id::text FROM public.clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Clinic members can upload clinic logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'clinic-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT cu.clinic_id::text FROM public.clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Clinic members can update clinic logos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'clinic-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT cu.clinic_id::text FROM public.clinic_users cu WHERE cu.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'clinic-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT cu.clinic_id::text FROM public.clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Clinic members can delete clinic logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'clinic-logos'
    AND (storage.foldername(name))[1] IN (
      SELECT cu.clinic_id::text FROM public.clinic_users cu WHERE cu.user_id = auth.uid()
    )
  );
