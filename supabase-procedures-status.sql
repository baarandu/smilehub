-- =====================================================
-- Script: Adicionar status em procedures
-- Propósito: Rastrear tratamentos pendentes
-- =====================================================

-- 1. Adicionar coluna status
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS 
  status VARCHAR(20) DEFAULT 'in_progress';

-- 2. Adicionar constraint para valores válidos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'procedures_status_check'
  ) THEN
    ALTER TABLE procedures 
    ADD CONSTRAINT procedures_status_check 
    CHECK (status IN ('pending', 'in_progress', 'completed'));
  END IF;
END $$;

-- 3. Migrar procedures existentes para 'completed' (já foram finalizados)
UPDATE procedures 
SET status = 'completed' 
WHERE status IS NULL OR status = 'in_progress';

-- 4. Adicionar índice para queries de pendentes
CREATE INDEX IF NOT EXISTS idx_procedures_status 
ON procedures(status);

-- 5. Adicionar índice composto para busca de pendentes por data
CREATE INDEX IF NOT EXISTS idx_procedures_status_updated 
ON procedures(status, updated_at);

-- =====================================================
-- NOTA: Execute este script no SQL Editor do Supabase
-- =====================================================
