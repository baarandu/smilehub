-- =============================================
-- SMILE CARE HUB - Database Schema
-- Execute este SQL no Supabase SQL Editor
-- =============================================

-- Enum para status de agendamento
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled');

-- =============================================
-- Tabela: patients (Pacientes)
-- =============================================
CREATE TABLE patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  birth_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para busca por nome
CREATE INDEX idx_patients_name ON patients(name);

-- =============================================
-- Tabela: consultations (Consultas/Prontuário)
-- =============================================
CREATE TABLE consultations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  notes TEXT,
  suggested_return_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para buscar consultas por paciente
CREATE INDEX idx_consultations_patient ON consultations(patient_id);
CREATE INDEX idx_consultations_date ON consultations(date);

-- =============================================
-- Tabela: appointments (Agendamentos)
-- =============================================
CREATE TABLE appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status appointment_status DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para buscar agendamentos por data
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);

-- =============================================
-- Trigger para atualizar updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER consultations_updated_at
  BEFORE UPDATE ON consultations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- Row Level Security (RLS)
-- =============================================
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas (para desenvolvimento)
-- Em produção, ajuste para autenticação adequada
CREATE POLICY "Allow all for patients" ON patients FOR ALL USING (true);
CREATE POLICY "Allow all for consultations" ON consultations FOR ALL USING (true);
CREATE POLICY "Allow all for appointments" ON appointments FOR ALL USING (true);

-- =============================================
-- Dados de exemplo (opcional)
-- =============================================
INSERT INTO patients (name, phone, email, birth_date) VALUES
  ('Maria Silva', '(11) 99999-1234', 'maria.silva@email.com', '1985-03-15'),
  ('João Santos', '(11) 98888-5678', 'joao.santos@email.com', '1990-07-22'),
  ('Ana Oliveira', '(11) 97777-9012', 'ana.oliveira@email.com', '1978-11-08'),
  ('Pedro Costa', '(11) 96666-3456', 'pedro.costa@email.com', '1995-01-30'),
  ('Lucia Fernandes', '(11) 95555-7890', 'lucia.fernandes@email.com', '1982-09-12');

-- Inserir consultas de exemplo
INSERT INTO consultations (patient_id, date, notes, suggested_return_date)
SELECT 
  id,
  '2024-12-01',
  'Limpeza completa realizada. Paciente apresentou sensibilidade nos dentes 14 e 15.',
  '2025-06-01'
FROM patients WHERE name = 'Maria Silva';

INSERT INTO consultations (patient_id, date, notes, suggested_return_date)
SELECT 
  id,
  '2024-11-20',
  'Avaliação inicial. Necessita tratamento de canal no dente 46.',
  '2025-01-20'
FROM patients WHERE name = 'João Santos';

-- Inserir agendamentos de exemplo para hoje
INSERT INTO appointments (patient_id, date, time, status, notes)
SELECT id, CURRENT_DATE, '09:00', 'scheduled', 'Retorno - avaliação pós limpeza'
FROM patients WHERE name = 'Maria Silva';

INSERT INTO appointments (patient_id, date, time, status, notes)
SELECT id, CURRENT_DATE, '10:30', 'scheduled', 'Consulta de rotina'
FROM patients WHERE name = 'Ana Oliveira';

INSERT INTO appointments (patient_id, date, time, status, notes)
SELECT id, CURRENT_DATE, '14:00', 'scheduled', NULL
FROM patients WHERE name = 'Pedro Costa';

INSERT INTO appointments (patient_id, date, time, status, notes)
SELECT id, CURRENT_DATE, '15:30', 'scheduled', 'Clareamento dental'
FROM patients WHERE name = 'Lucia Fernandes';




