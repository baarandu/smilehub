-- SQL para garantir que as colunas de pagador existam na tabela financial_transactions
-- Execute este script no Supabase SQL Editor

-- Adicionar coluna payer_is_patient (boolean, default true)
ALTER TABLE financial_transactions
ADD COLUMN IF NOT EXISTS payer_is_patient boolean DEFAULT true;

-- Adicionar coluna payer_name (texto para nome do pagador)
ALTER TABLE financial_transactions
ADD COLUMN IF NOT EXISTS payer_name text;

-- Adicionar coluna payer_cpf (texto para CPF do pagador)
ALTER TABLE financial_transactions
ADD COLUMN IF NOT EXISTS payer_cpf text;

-- Adicionar coluna payer_type (PF ou PJ)
ALTER TABLE financial_transactions
ADD COLUMN IF NOT EXISTS payer_type text CHECK (payer_type IN ('PF', 'PJ'));

-- Adicionar coluna pj_source_id (referência para fonte PJ/convênio)
ALTER TABLE financial_transactions
ADD COLUMN IF NOT EXISTS pj_source_id uuid REFERENCES pj_sources(id) ON DELETE SET NULL;

-- Adicionar coluna irrf_amount (valor do IRRF retido)
ALTER TABLE financial_transactions
ADD COLUMN IF NOT EXISTS irrf_amount numeric DEFAULT 0;

-- Criar índice para buscar transações por tipo de pagador
CREATE INDEX IF NOT EXISTS idx_financial_transactions_payer_type
ON financial_transactions(payer_type);

-- Criar índice para buscar transações incompletas (sem CPF)
CREATE INDEX IF NOT EXISTS idx_financial_transactions_incomplete
ON financial_transactions(payer_is_patient, payer_cpf)
WHERE payer_is_patient = true AND payer_cpf IS NULL;

-- Atualizar transações existentes para marcar que paciente é o pagador por padrão
-- (somente se a coluna estava vazia/null)
UPDATE financial_transactions
SET payer_is_patient = true
WHERE payer_is_patient IS NULL AND type = 'income';

-- Comentários nas colunas para documentação
COMMENT ON COLUMN financial_transactions.payer_is_patient IS 'Indica se o paciente é o pagador (true) ou se é outra pessoa/empresa (false)';
COMMENT ON COLUMN financial_transactions.payer_name IS 'Nome do pagador quando não é o paciente';
COMMENT ON COLUMN financial_transactions.payer_cpf IS 'CPF do pagador (do paciente ou de terceiro)';
COMMENT ON COLUMN financial_transactions.payer_type IS 'Tipo de pagador: PF (Pessoa Física) ou PJ (Pessoa Jurídica)';
COMMENT ON COLUMN financial_transactions.pj_source_id IS 'ID da fonte pagadora PJ (convênio) quando payer_type = PJ';
COMMENT ON COLUMN financial_transactions.irrf_amount IS 'Valor do Imposto de Renda Retido na Fonte';
