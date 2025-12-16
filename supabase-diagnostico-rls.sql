-- =====================================================
-- DIAGNÓSTICO: Verificar isolamento de dados
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- 1. Listar todas as clínicas
SELECT '=== CLÍNICAS ===' as section;
SELECT id, name, created_at FROM clinics;

-- 2. Listar todos os usuários e suas clínicas
SELECT '=== USUÁRIOS E CLÍNICAS ===' as section;
SELECT 
  cu.user_id,
  p.full_name,
  c.name as clinic_name,
  cu.role,
  cu.created_at
FROM clinic_users cu
LEFT JOIN profiles p ON cu.user_id = p.id
LEFT JOIN clinics c ON cu.clinic_id = c.id;

-- 3. Verificar se há pacientes sem clinic_id
SELECT '=== PACIENTES SEM CLINIC_ID ===' as section;
SELECT COUNT(*) as pacientes_sem_clinic FROM patients WHERE clinic_id IS NULL;

-- 4. Verificar distribuição de pacientes por clínica
SELECT '=== PACIENTES POR CLÍNICA ===' as section;
SELECT 
  c.name as clinic_name,
  COUNT(p.id) as total_patients
FROM clinics c
LEFT JOIN patients p ON p.clinic_id = c.id
GROUP BY c.id, c.name;

-- 5. Verificar se RLS está habilitado
SELECT '=== STATUS RLS ===' as section;
SELECT 
  schemaname, 
  tablename, 
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('patients', 'appointments', 'financial_transactions', 'procedures', 'budgets', 'exams', 'anamneses', 'locations');

-- 6. Verificar políticas existentes
SELECT '=== POLÍTICAS RLS ===' as section;
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
