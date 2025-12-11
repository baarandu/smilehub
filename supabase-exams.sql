-- Criar tabela de exames
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  order_date DATE NOT NULL,
  exam_date DATE,
  file_url TEXT,
  file_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_exams_patient_id ON exams(patient_id);
CREATE INDEX IF NOT EXISTS idx_exams_order_date ON exams(order_date);
CREATE INDEX IF NOT EXISTS idx_exams_exam_date ON exams(exam_date);

-- RLS Policies
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver todos os exames
DROP POLICY IF EXISTS "Users can view all exams" ON exams;
CREATE POLICY "Users can view all exams"
  ON exams FOR SELECT
  USING (true);

-- Policy: Usuários podem inserir exames
DROP POLICY IF EXISTS "Users can insert exams" ON exams;
CREATE POLICY "Users can insert exams"
  ON exams FOR INSERT
  WITH CHECK (true);

-- Policy: Usuários podem atualizar exames
DROP POLICY IF EXISTS "Users can update exams" ON exams;
CREATE POLICY "Users can update exams"
  ON exams FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Usuários podem deletar exames
DROP POLICY IF EXISTS "Users can delete exams" ON exams;
CREATE POLICY "Users can delete exams"
  ON exams FOR DELETE
  USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_exams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS exams_updated_at ON exams;
CREATE TRIGGER exams_updated_at
  BEFORE UPDATE ON exams
  FOR EACH ROW
  EXECUTE FUNCTION update_exams_updated_at();

