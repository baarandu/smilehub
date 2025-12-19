-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view files in 'exams' bucket
CREATE POLICY "Authenticated users can select exams"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'exams');

-- Allow authenticated users to upload/update/delete files in 'exams' bucket
CREATE POLICY "Authenticated users can insert exams"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'exams');

CREATE POLICY "Authenticated users can update exams"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'exams');

CREATE POLICY "Authenticated users can delete exams"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'exams');

-- Allow public access to 'clinic-assets' (letterheads)
CREATE POLICY "Public access to clinic-assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'clinic-assets');

-- Allow authenticated users to manage 'clinic-assets'
CREATE POLICY "Authenticated users can manage clinic-assets"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'clinic-assets');
