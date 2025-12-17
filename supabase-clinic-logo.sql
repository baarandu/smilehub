-- =====================================================
-- Add Logo to Clinics Table and Storage Bucket
-- Execute this in Supabase SQL Editor
-- =====================================================

-- 1. Add logo_url column to clinics table
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS logo_url text;

-- 2. Create storage bucket for clinic logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-logos', 'clinic-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up storage policies for clinic logos
DROP POLICY IF EXISTS "Users can upload clinic logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update clinic logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete clinic logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view clinic logos" ON storage.objects;

-- Allow authenticated users to upload logos
CREATE POLICY "Users can upload clinic logos" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'clinic-logos');

-- Allow authenticated users to update their logos
CREATE POLICY "Users can update clinic logos" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'clinic-logos');

-- Allow authenticated users to delete their logos
CREATE POLICY "Users can delete clinic logos" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'clinic-logos');

-- Allow public read access to logos
CREATE POLICY "Public can view clinic logos" ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'clinic-logos');

-- 4. Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clinics' AND column_name = 'logo_url';
