-- =====================================================
-- STORAGE POLICIES POR CLÍNICA
-- Isola arquivos de cada clínica no Supabase Storage
-- =====================================================
-- Executar no Supabase SQL Editor
-- =====================================================

-- Primeiro, dropar as policies antigas
DROP POLICY IF EXISTS "Authenticated users can select exams" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can insert exams" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update exams" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete exams" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can manage clinic-assets" ON storage.objects;

-- =====================================================
-- BUCKET: exams
-- Arquivos devem ser organizados como: {clinic_id}/{filename}
-- =====================================================

-- SELECT: Usuário só vê arquivos da sua clínica
CREATE POLICY "Users can view their clinic exams"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'exams' 
    AND (storage.foldername(name))[1] = (
        SELECT clinic_id::text 
        FROM clinic_users 
        WHERE user_id = auth.uid() 
        LIMIT 1
    )
);

-- INSERT: Usuário só pode criar arquivos na pasta da sua clínica
CREATE POLICY "Users can upload to their clinic exams"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'exams' 
    AND (storage.foldername(name))[1] = (
        SELECT clinic_id::text 
        FROM clinic_users 
        WHERE user_id = auth.uid() 
        LIMIT 1
    )
);

-- UPDATE: Usuário só pode atualizar arquivos da sua clínica
CREATE POLICY "Users can update their clinic exams"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'exams' 
    AND (storage.foldername(name))[1] = (
        SELECT clinic_id::text 
        FROM clinic_users 
        WHERE user_id = auth.uid() 
        LIMIT 1
    )
);

-- DELETE: Usuário só pode deletar arquivos da sua clínica
CREATE POLICY "Users can delete their clinic exams"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'exams' 
    AND (storage.foldername(name))[1] = (
        SELECT clinic_id::text 
        FROM clinic_users 
        WHERE user_id = auth.uid() 
        LIMIT 1
    )
);

-- =====================================================
-- BUCKET: clinic-assets (logos, etc)
-- Arquivos devem ser organizados como: {clinic_id}/{filename}
-- =====================================================

-- SELECT: Público pode ver (logos aparecem em relatórios)
-- Mantém como está - logos são públicos

-- Para gerenciamento, isolar por clínica
CREATE POLICY "Users can manage their clinic assets"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'clinic-assets' 
    AND (
        -- Acesso público para leitura (logos)
        -- Ou pasta pertence à clínica do usuário para escrita
        (storage.foldername(name))[1] = (
            SELECT clinic_id::text 
            FROM clinic_users 
            WHERE user_id = auth.uid() 
            LIMIT 1
        )
    )
)
WITH CHECK (
    bucket_id = 'clinic-assets' 
    AND (storage.foldername(name))[1] = (
        SELECT clinic_id::text 
        FROM clinic_users 
        WHERE user_id = auth.uid() 
        LIMIT 1
    )
);

-- =====================================================
-- BUCKET: patient-documents
-- Arquivos devem ser organizados como: {clinic_id}/{patient_id}/{filename}
-- =====================================================

DROP POLICY IF EXISTS "Users can view patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload patient documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete patient documents" ON storage.objects;

-- SELECT
CREATE POLICY "Users can view their clinic patient documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'patient-documents' 
    AND (storage.foldername(name))[1] = (
        SELECT clinic_id::text 
        FROM clinic_users 
        WHERE user_id = auth.uid() 
        LIMIT 1
    )
);

-- INSERT
CREATE POLICY "Users can upload to their clinic patient documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'patient-documents' 
    AND (storage.foldername(name))[1] = (
        SELECT clinic_id::text 
        FROM clinic_users 
        WHERE user_id = auth.uid() 
        LIMIT 1
    )
);

-- UPDATE
CREATE POLICY "Users can update their clinic patient documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'patient-documents' 
    AND (storage.foldername(name))[1] = (
        SELECT clinic_id::text 
        FROM clinic_users 
        WHERE user_id = auth.uid() 
        LIMIT 1
    )
);

-- DELETE
CREATE POLICY "Users can delete their clinic patient documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'patient-documents' 
    AND (storage.foldername(name))[1] = (
        SELECT clinic_id::text 
        FROM clinic_users 
        WHERE user_id = auth.uid() 
        LIMIT 1
    )
);

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
SELECT 
    policyname,
    tablename,
    cmd
FROM pg_policies 
WHERE tablename = 'objects'
ORDER BY policyname;
