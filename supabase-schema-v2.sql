-- =============================================
-- SMILE CARE HUB - Schema V2 - Documentos e Campos Extras
-- Execute este SQL no Supabase SQL Editor
-- =============================================

-- =============================================
-- Adicionar campos extras na tabela patients
-- =============================================
ALTER TABLE patients ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS rg VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS state VARCHAR(2);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS occupation VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(255);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_phone VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS health_insurance VARCHAR(100);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS health_insurance_number VARCHAR(50);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medications TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS medical_history TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Index para CPF (apenas se não existir)
CREATE INDEX IF NOT EXISTS idx_patients_cpf ON patients(cpf);

-- =============================================
-- Tabela: patient_documents (Documentos/Exames)
-- =============================================
CREATE TABLE IF NOT EXISTS patient_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  category VARCHAR(50),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para buscar documentos por paciente
CREATE INDEX IF NOT EXISTS idx_patient_documents_patient ON patient_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_category ON patient_documents(category);

-- Trigger para atualizar updated_at (drop primeiro se existir)
DROP TRIGGER IF EXISTS patient_documents_updated_at ON patient_documents;
CREATE TRIGGER patient_documents_updated_at
  BEFORE UPDATE ON patient_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS para patient_documents
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

-- Drop policy se existir e criar novamente
DROP POLICY IF EXISTS "Allow all for patient_documents" ON patient_documents;
CREATE POLICY "Allow all for patient_documents" ON patient_documents FOR ALL USING (true);

-- =============================================
-- Criar bucket no Supabase Storage (execute manualmente no Dashboard)
-- Storage > New bucket > Nome: patient-documents > Public: true
-- =============================================
