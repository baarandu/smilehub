-- =====================================================
-- Migration Script for Existing Data
-- Execute this AFTER schema and RLS scripts
-- =====================================================

-- 1. Criar clínica padrão para dados existentes
INSERT INTO clinics (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Clínica Principal')
ON CONFLICT (id) DO NOTHING;

-- 2. Associar usuários existentes como admins da clínica padrão
INSERT INTO clinic_users (clinic_id, user_id, role)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  id,
  'admin'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM clinic_users)
ON CONFLICT (clinic_id, user_id) DO NOTHING;

-- 3. Atualizar registros existentes com clinic_id
UPDATE patients 
SET clinic_id = '00000000-0000-0000-0000-000000000001' 
WHERE clinic_id IS NULL;

UPDATE appointments 
SET clinic_id = '00000000-0000-0000-0000-000000000001' 
WHERE clinic_id IS NULL;

UPDATE financial_transactions 
SET clinic_id = '00000000-0000-0000-0000-000000000001' 
WHERE clinic_id IS NULL;

UPDATE procedures 
SET clinic_id = '00000000-0000-0000-0000-000000000001' 
WHERE clinic_id IS NULL;

UPDATE budgets 
SET clinic_id = '00000000-0000-0000-0000-000000000001' 
WHERE clinic_id IS NULL;

UPDATE exams 
SET clinic_id = '00000000-0000-0000-0000-000000000001' 
WHERE clinic_id IS NULL;

UPDATE anamneses 
SET clinic_id = '00000000-0000-0000-0000-000000000001' 
WHERE clinic_id IS NULL;

UPDATE locations 
SET clinic_id = '00000000-0000-0000-0000-000000000001' 
WHERE clinic_id IS NULL;

-- 4. Tornar clinic_id NOT NULL após migração (opcional - execute só se todos os dados foram migrados)
-- ALTER TABLE patients ALTER COLUMN clinic_id SET NOT NULL;
-- ALTER TABLE appointments ALTER COLUMN clinic_id SET NOT NULL;
-- ALTER TABLE financial_transactions ALTER COLUMN clinic_id SET NOT NULL;
-- ALTER TABLE procedures ALTER COLUMN clinic_id SET NOT NULL;
-- ALTER TABLE budgets ALTER COLUMN clinic_id SET NOT NULL;
-- ALTER TABLE exams ALTER COLUMN clinic_id SET NOT NULL;
-- ALTER TABLE anamneses ALTER COLUMN clinic_id SET NOT NULL;
-- ALTER TABLE locations ALTER COLUMN clinic_id SET NOT NULL;
