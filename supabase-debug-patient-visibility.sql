-- =====================================================
-- DIAGNÓSTICO: Por que paciente não aparece?
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Ver o clinic_id da paciente Silvia
SELECT 
    id,
    name,
    clinic_id,
    email
FROM patients 
WHERE name ILIKE '%silvia%helena%';

-- 2. Ver em qual clínica o usuário vitor_cb@hotmail.com está
SELECT 
    cu.user_id,
    cu.clinic_id,
    cu.role,
    c.name as clinica_nome,
    au.email
FROM clinic_users cu
JOIN clinics c ON cu.clinic_id = c.id
JOIN auth.users au ON cu.user_id = au.id
WHERE au.email = 'vitor_cb@hotmail.com';

-- 3. Ver TODOS os usuários e suas clínicas
SELECT 
    au.email,
    c.name as clinica,
    cu.role,
    cu.clinic_id
FROM clinic_users cu
JOIN clinics c ON cu.clinic_id = c.id
JOIN auth.users au ON cu.user_id = au.id
ORDER BY c.name, au.email;

-- 4. Ver pacientes SEM clinic_id (órfãos)
SELECT 
    id,
    name,
    clinic_id
FROM patients 
WHERE clinic_id IS NULL;

-- 5. Ver quantos pacientes cada clínica tem
SELECT 
    c.name as clinica,
    c.id as clinic_id,
    COUNT(p.id) as total_pacientes
FROM clinics c
LEFT JOIN patients p ON p.clinic_id = c.id
GROUP BY c.id, c.name
ORDER BY c.name;
