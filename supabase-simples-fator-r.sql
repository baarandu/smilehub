-- Migration: Add Simples Nacional Fator R fields to fiscal_profiles
-- Run this in Supabase SQL Editor

-- Add new columns for Simples Nacional Fator R configuration
ALTER TABLE fiscal_profiles
ADD COLUMN IF NOT EXISTS simples_fator_r_mode TEXT DEFAULT 'manual' CHECK (simples_fator_r_mode IN ('auto', 'manual')),
ADD COLUMN IF NOT EXISTS simples_monthly_payroll NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS simples_anexo TEXT DEFAULT 'anexo_iii' CHECK (simples_anexo IN ('anexo_iii', 'anexo_v'));

-- Comment on columns
COMMENT ON COLUMN fiscal_profiles.simples_fator_r_mode IS 'Mode for Fator R calculation: auto (from payroll) or manual (user selects anexo)';
COMMENT ON COLUMN fiscal_profiles.simples_monthly_payroll IS 'Monthly payroll amount for automatic Fator R calculation';
COMMENT ON COLUMN fiscal_profiles.simples_anexo IS 'Selected Simples Nacional anexo: anexo_iii (Fator R >= 28%) or anexo_v (Fator R < 28%)';
