-- =====================================================
-- VERIFICAR DADOS COM FORMATO INCORRETO
-- Execute no Supabase SQL Editor
-- =====================================================

-- 1. Telefones com formato incorreto
-- Esperado: (11) 99999-9999 ou 11999999999 (10 ou 11 dígitos)
SELECT 
    'TELEFONE INCORRETO' as problema,
    COUNT(*) as quantidade
FROM patients 
WHERE phone IS NOT NULL 
  AND phone != ''
  AND phone !~ '^(\(\d{2}\)\s?\d{4,5}-?\d{4}|\d{10,11})$';

-- 2. CPFs com formato incorreto
-- Esperado: 000.000.000-00 ou 00000000000 (11 dígitos)
SELECT 
    'CPF INCORRETO' as problema,
    COUNT(*) as quantidade
FROM patients 
WHERE cpf IS NOT NULL 
  AND cpf != ''
  AND cpf !~ '^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$';

-- 3. Emails com formato incorreto
SELECT 
    'EMAIL INCORRETO' as problema,
    COUNT(*) as quantidade
FROM patients 
WHERE email IS NOT NULL 
  AND email != ''
  AND email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';

-- 4. Ver detalhes dos telefones incorretos
SELECT 
    name,
    phone,
    'Formato esperado: (11) 99999-9999' as formato_correto
FROM patients 
WHERE phone IS NOT NULL 
  AND phone != ''
  AND phone !~ '^(\(\d{2}\)\s?\d{4,5}-?\d{4}|\d{10,11})$'
LIMIT 20;

-- 5. Ver detalhes dos CPFs incorretos
SELECT 
    name,
    cpf,
    'Formato esperado: 000.000.000-00' as formato_correto
FROM patients 
WHERE cpf IS NOT NULL 
  AND cpf != ''
  AND cpf !~ '^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$'
LIMIT 20;

-- 6. Resumo geral
SELECT 
    'Total de pacientes' as metrica,
    COUNT(*) as valor
FROM patients
UNION ALL
SELECT 
    'Com telefone preenchido',
    COUNT(*) 
FROM patients WHERE phone IS NOT NULL AND phone != ''
UNION ALL
SELECT 
    'Com CPF preenchido',
    COUNT(*) 
FROM patients WHERE cpf IS NOT NULL AND cpf != ''
UNION ALL
SELECT 
    'Com email preenchido',
    COUNT(*) 
FROM patients WHERE email IS NOT NULL AND email != '';
