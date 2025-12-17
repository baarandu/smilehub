-- =============================================
-- SEED DATA - Execute para popular dados de teste
-- =============================================

-- Limpar dados existentes (opcional)
DELETE FROM appointments;
DELETE FROM consultations;
DELETE FROM patients;

-- Inserir pacientes
INSERT INTO patients (id, name, phone, email, birth_date) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Maria Silva', '(11) 99999-1234', 'maria.silva@email.com', '1985-03-15'),
  ('22222222-2222-2222-2222-222222222222', 'João Santos', '(11) 98888-5678', 'joao.santos@email.com', '1990-07-22'),
  ('33333333-3333-3333-3333-333333333333', 'Ana Oliveira', '(11) 97777-9012', 'ana.oliveira@email.com', '1978-11-08'),
  ('44444444-4444-4444-4444-444444444444', 'Pedro Costa', '(11) 96666-3456', 'pedro.costa@email.com', '1995-01-30'),
  ('55555555-5555-5555-5555-555555555555', 'Lucia Fernandes', '(11) 95555-7890', 'lucia.fernandes@email.com', '1982-09-12');

-- Inserir consultas com retornos FUTUROS (próximos dias)
INSERT INTO consultations (patient_id, date, notes, suggested_return_date) VALUES
  ('11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '30 days', 'Limpeza completa realizada. Paciente apresentou sensibilidade nos dentes 14 e 15.', CURRENT_DATE + INTERVAL '5 days'),
  ('22222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '60 days', 'Avaliação inicial. Necessita tratamento de canal no dente 46.', CURRENT_DATE + INTERVAL '3 days'),
  ('33333333-3333-3333-3333-333333333333', CURRENT_DATE - INTERVAL '90 days', 'Restauração do dente 36. Procedimento sem intercorrências.', CURRENT_DATE + INTERVAL '10 days'),
  ('55555555-5555-5555-5555-555555555555', CURRENT_DATE - INTERVAL '45 days', 'Extração do dente 18 (siso). Orientações pós-operatórias fornecidas.', CURRENT_DATE + INTERVAL '7 days');

-- Inserir agendamentos para HOJE
INSERT INTO appointments (patient_id, date, time, status, notes) VALUES
  ('11111111-1111-1111-1111-111111111111', CURRENT_DATE, '09:00', 'scheduled', 'Retorno - avaliação pós limpeza'),
  ('33333333-3333-3333-3333-333333333333', CURRENT_DATE, '10:30', 'scheduled', 'Consulta de rotina'),
  ('44444444-4444-4444-4444-444444444444', CURRENT_DATE, '14:00', 'scheduled', NULL),
  ('55555555-5555-5555-5555-555555555555', CURRENT_DATE, '15:30', 'scheduled', 'Clareamento dental');

-- Inserir agendamentos para AMANHÃ
INSERT INTO appointments (patient_id, date, time, status, notes) VALUES
  ('22222222-2222-2222-2222-222222222222', CURRENT_DATE + INTERVAL '1 day', '09:30', 'scheduled', 'Retorno pós tratamento'),
  ('11111111-1111-1111-1111-111111111111', CURRENT_DATE + INTERVAL '1 day', '11:00', 'scheduled', 'Aplicação de flúor');



