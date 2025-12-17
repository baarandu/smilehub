-- =====================================================
-- Fix Exams Table - Allow Inserts
-- Execute this in Supabase SQL Editor
-- =====================================================

-- Drop all existing policies on exams
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON exams;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON exams;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON exams;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON exams;
DROP POLICY IF EXISTS "View exams from clinic" ON exams;
DROP POLICY IF EXISTS "Editors can insert exams" ON exams;
DROP POLICY IF EXISTS "Editors can update exams" ON exams;
DROP POLICY IF EXISTS "Admins can delete exams" ON exams;
DROP POLICY IF EXISTS "Allow all for exams" ON exams;
DROP POLICY IF EXISTS "Users can view all exams" ON exams;
DROP POLICY IF EXISTS "Users can insert exams" ON exams;
DROP POLICY IF EXISTS "Users can update exams" ON exams;
DROP POLICY IF EXISTS "Users can delete exams" ON exams;

-- Create simple permissive policies for authenticated users
CREATE POLICY "exams_select_policy" ON exams
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "exams_insert_policy" ON exams
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "exams_update_policy" ON exams
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "exams_delete_policy" ON exams
    FOR DELETE TO authenticated USING (true);

-- Make clinic_id optional if not already
ALTER TABLE exams ALTER COLUMN clinic_id DROP NOT NULL;

-- Check table structure
SELECT column_name, is_nullable, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'exams' 
ORDER BY ordinal_position;
