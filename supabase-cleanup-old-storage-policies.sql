-- =====================================================
-- LIMPEZA DE POLÍTICAS ANTIGAS (PERMISSIVAS)
-- Executar APÓS verificar que o app funciona com as novas políticas
-- =====================================================
-- Executar no Supabase SQL Editor
-- =====================================================

-- Políticas que permitem acesso a QUALQUER usuário autenticado (sem isolamento por clínica)
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;

-- Políticas antigas de exames (sem isolamento)
DROP POLICY IF EXISTS "Authenticated Delete for exams" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload for exams" ON storage.objects;
DROP POLICY IF EXISTS "Exams Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Read Access for exams" ON storage.objects;

-- Políticas antigas de usuário (não por clínica)
DROP POLICY IF EXISTS "Give users access to own folder 1qoi23_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1qoi23_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1qoi23_2" ON storage.objects;

-- Políticas com sufixos aleatórios (parecem ser criadas pelo Supabase UI)
DROP POLICY IF EXISTS "Acesso total autenticado 1lpwz8_0" ON storage.objects;
DROP POLICY IF EXISTS "Acesso total autenticado 1lpwz8_1" ON storage.objects;
DROP POLICY IF EXISTS "Acesso total autenticado 1lpwz8_2" ON storage.objects;
DROP POLICY IF EXISTS "Acesso total autenticado 1lpwz8_3" ON storage.objects;
DROP POLICY IF EXISTS "Acesso total autenticado xr6sco_0" ON storage.objects;
DROP POLICY IF EXISTS "Acesso total autenticado xr6sco_1" ON storage.objects;
DROP POLICY IF EXISTS "Acesso total autenticado xr6sco_2" ON storage.objects;
DROP POLICY IF EXISTS "Acesso total autenticado xr6sco_3" ON storage.objects;

-- Políticas de clinic-assets que podem conflitar
DROP POLICY IF EXISTS "Authenticated users can manage clinic-assets" ON storage.objects;

-- =====================================================
-- VERIFICAÇÃO - Deve sobrar apenas as novas políticas
-- =====================================================
SELECT 
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'objects'
ORDER BY policyname;

-- Políticas esperadas após limpeza:
-- - Public access to clinic-assets (ou Public can view clinic logos)
-- - Users can delete their clinic exams
-- - Users can delete their clinic patient documents
-- - Users can manage their clinic assets
-- - Users can update their clinic exams
-- - Users can update their clinic patient documents
-- - Users can upload to their clinic exams
-- - Users can upload to their clinic patient documents
-- - Users can view their clinic exams
-- - Users can view their clinic patient documents
