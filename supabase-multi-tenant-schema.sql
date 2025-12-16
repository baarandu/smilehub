-- =====================================================
-- Multi-Tenant Schema for Smile Care Hub
-- Execute this FIRST before RLS and migration scripts
-- =====================================================

-- 1. Criar tabela de clínicas
CREATE TABLE IF NOT EXISTS clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Criar tabela de usuários por clínica (com role)
CREATE TABLE IF NOT EXISTS clinic_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')) DEFAULT 'viewer',
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, user_id)
);

-- 3. Adicionar clinic_id às tabelas existentes
ALTER TABLE patients ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id);
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id);
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id);
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id);
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id);
ALTER TABLE locations ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id);

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_patients_clinic ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_financial_clinic ON financial_transactions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_procedures_clinic ON procedures(clinic_id);
CREATE INDEX IF NOT EXISTS idx_budgets_clinic ON budgets(clinic_id);
CREATE INDEX IF NOT EXISTS idx_exams_clinic ON exams(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_users_user ON clinic_users(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_users_clinic ON clinic_users(clinic_id);

-- 5. Funções auxiliares para RLS
CREATE OR REPLACE FUNCTION get_user_clinic_id()
RETURNS uuid AS $$
  SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM clinic_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_can_edit()
RETURNS boolean AS $$
  SELECT get_user_role() IN ('admin', 'editor');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_is_admin()
RETURNS boolean AS $$
  SELECT get_user_role() = 'admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 6. Trigger para criar clínica automaticamente ao registrar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_clinic_id uuid;
BEGIN
  -- Criar nova clínica para o usuário
  INSERT INTO clinics (name) 
  VALUES (COALESCE(NEW.raw_user_meta_data->>'clinic_name', 'Minha Clínica'))
  RETURNING id INTO new_clinic_id;
  
  -- Associar usuário como admin da clínica
  INSERT INTO clinic_users (clinic_id, user_id, role)
  VALUES (new_clinic_id, NEW.id, 'admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger (drop se existir para evitar duplicação)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
