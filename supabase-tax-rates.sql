-- Tax Rate Configuration Tables
-- This migration adds configurable tax rates for all tax regimes

-- ============================================
-- TABLE: tax_rate_configurations
-- Stores tax rate configurations per clinic/regime
-- ============================================
CREATE TABLE IF NOT EXISTS tax_rate_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,

    tax_regime TEXT NOT NULL CHECK (tax_regime IN ('pf_carne_leao', 'simples', 'lucro_presumido', 'lucro_real')),
    tax_type TEXT NOT NULL, -- 'irpf', 'irpj', 'irpj_adicional', 'csll', 'pis', 'cofins', 'iss', 'das', 'das_anexo_v', 'inss'
    rate_type TEXT NOT NULL CHECK (rate_type IN ('flat', 'progressive')),
    flat_rate NUMERIC(6,4), -- For flat rates (e.g., 0.15 = 15%)
    presumption_rate NUMERIC(6,4), -- For Lucro Presumido base calculation (32% for services)
    description TEXT,
    effective_from DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(clinic_id, tax_regime, tax_type, effective_from)
);

-- ============================================
-- TABLE: tax_rate_brackets
-- Stores progressive tax brackets (for IRPF and Simples Nacional)
-- ============================================
CREATE TABLE IF NOT EXISTS tax_rate_brackets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tax_configuration_id UUID REFERENCES tax_rate_configurations(id) ON DELETE CASCADE NOT NULL,

    min_value NUMERIC(15,2) NOT NULL,
    max_value NUMERIC(15,2), -- NULL = last bracket (unlimited)
    rate NUMERIC(6,4) NOT NULL, -- e.g., 0.275 = 27.5%
    deduction NUMERIC(15,2) DEFAULT 0, -- Deduction amount for this bracket
    bracket_order INTEGER NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tax_configuration_id, bracket_order)
);

-- ============================================
-- TABLE: iss_municipal_rates
-- Stores ISS rates per municipality
-- ============================================
CREATE TABLE IF NOT EXISTS iss_municipal_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,

    city TEXT NOT NULL,
    state TEXT NOT NULL,
    rate NUMERIC(6,4) NOT NULL, -- 2% to 5%
    is_default BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(clinic_id, city, state)
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tax_rate_configurations_clinic ON tax_rate_configurations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tax_rate_configurations_regime ON tax_rate_configurations(clinic_id, tax_regime);
CREATE INDEX IF NOT EXISTS idx_tax_rate_brackets_config ON tax_rate_brackets(tax_configuration_id);
CREATE INDEX IF NOT EXISTS idx_iss_municipal_rates_clinic ON iss_municipal_rates(clinic_id);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE tax_rate_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rate_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE iss_municipal_rates ENABLE ROW LEVEL SECURITY;

-- tax_rate_configurations policies
CREATE POLICY "Users can view their clinic tax configurations"
    ON tax_rate_configurations FOR SELECT
    USING (clinic_id IN (
        SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their clinic tax configurations"
    ON tax_rate_configurations FOR INSERT
    WITH CHECK (clinic_id IN (
        SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their clinic tax configurations"
    ON tax_rate_configurations FOR UPDATE
    USING (clinic_id IN (
        SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their clinic tax configurations"
    ON tax_rate_configurations FOR DELETE
    USING (clinic_id IN (
        SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
    ));

-- tax_rate_brackets policies
CREATE POLICY "Users can view their clinic tax brackets"
    ON tax_rate_brackets FOR SELECT
    USING (tax_configuration_id IN (
        SELECT id FROM tax_rate_configurations WHERE clinic_id IN (
            SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert their clinic tax brackets"
    ON tax_rate_brackets FOR INSERT
    WITH CHECK (tax_configuration_id IN (
        SELECT id FROM tax_rate_configurations WHERE clinic_id IN (
            SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Users can update their clinic tax brackets"
    ON tax_rate_brackets FOR UPDATE
    USING (tax_configuration_id IN (
        SELECT id FROM tax_rate_configurations WHERE clinic_id IN (
            SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete their clinic tax brackets"
    ON tax_rate_brackets FOR DELETE
    USING (tax_configuration_id IN (
        SELECT id FROM tax_rate_configurations WHERE clinic_id IN (
            SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
        )
    ));

-- iss_municipal_rates policies
CREATE POLICY "Users can view their clinic ISS rates"
    ON iss_municipal_rates FOR SELECT
    USING (clinic_id IN (
        SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their clinic ISS rates"
    ON iss_municipal_rates FOR INSERT
    WITH CHECK (clinic_id IN (
        SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update their clinic ISS rates"
    ON iss_municipal_rates FOR UPDATE
    USING (clinic_id IN (
        SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their clinic ISS rates"
    ON iss_municipal_rates FOR DELETE
    USING (clinic_id IN (
        SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
    ));

-- ============================================
-- FUNCTION: seed_default_tax_rates
-- Populates default tax rates for a clinic
-- ============================================
CREATE OR REPLACE FUNCTION seed_default_tax_rates(p_clinic_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_irpf_config_id UUID;
    v_simples_anexo3_id UUID;
    v_simples_anexo5_id UUID;
BEGIN
    -- ============================================
    -- PF Autonomo (IRPF 2026 - Nova Tabela)
    -- ============================================

    -- IRPF Progressive Table 2026
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, description)
    VALUES (p_clinic_id, 'pf_carne_leao', 'irpf', 'progressive', 'IRPF 2026 - Isento ate R$5.000/mes')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING
    RETURNING id INTO v_irpf_config_id;

    IF v_irpf_config_id IS NOT NULL THEN
        -- IRPF brackets 2026 (monthly values)
        INSERT INTO tax_rate_brackets (tax_configuration_id, min_value, max_value, rate, deduction, bracket_order) VALUES
        (v_irpf_config_id, 0, 5000.00, 0, 0, 1),              -- Isento ate R$5.000
        (v_irpf_config_id, 5000.01, 7350.00, 0.15, 750.00, 2),     -- Reducao parcial (15% com deducao)
        (v_irpf_config_id, 7350.01, NULL, 0.275, 908.73, 3);       -- 27.5% tabela padrao
    END IF;

    -- INSS Autonomo (20% sobre rendimento)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, description)
    VALUES (p_clinic_id, 'pf_carne_leao', 'inss', 'flat', 0.20, 'INSS Autonomo - 20% (limite teto previdencia)')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- ISS for PF (2% a 5%)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, description)
    VALUES (p_clinic_id, 'pf_carne_leao', 'iss', 'flat', 0.05, 'ISS - 2% a 5% conforme municipio')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- ============================================
    -- Simples Nacional - Anexo III (Fator R >= 28%)
    -- Mais vantajoso - com folha de pagamento
    -- ============================================

    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, description)
    VALUES (p_clinic_id, 'simples', 'das', 'progressive', 'Anexo III - Fator R >= 28% (mais vantajoso)')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING
    RETURNING id INTO v_simples_anexo3_id;

    IF v_simples_anexo3_id IS NOT NULL THEN
        -- Simples Nacional Anexo III (RBT12 - faturamento anual)
        INSERT INTO tax_rate_brackets (tax_configuration_id, min_value, max_value, rate, deduction, bracket_order) VALUES
        (v_simples_anexo3_id, 0, 180000.00, 0.06, 0, 1),                 -- 6%
        (v_simples_anexo3_id, 180000.01, 360000.00, 0.112, 9360.00, 2),  -- 11.2%
        (v_simples_anexo3_id, 360000.01, 720000.00, 0.135, 17640.00, 3), -- 13.5%
        (v_simples_anexo3_id, 720000.01, 1800000.00, 0.16, 35640.00, 4), -- 16%
        (v_simples_anexo3_id, 1800000.01, 3600000.00, 0.21, 125640.00, 5), -- 21%
        (v_simples_anexo3_id, 3600000.01, 4800000.00, 0.33, 648000.00, 6); -- 33%
    END IF;

    -- ============================================
    -- Simples Nacional - Anexo V (Fator R < 28%)
    -- Sem folha de pagamento adequada
    -- ============================================

    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, description)
    VALUES (p_clinic_id, 'simples', 'das_anexo_v', 'progressive', 'Anexo V - Fator R < 28% (sem folha adequada)')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING
    RETURNING id INTO v_simples_anexo5_id;

    IF v_simples_anexo5_id IS NOT NULL THEN
        -- Simples Nacional Anexo V (RBT12 - faturamento anual)
        INSERT INTO tax_rate_brackets (tax_configuration_id, min_value, max_value, rate, deduction, bracket_order) VALUES
        (v_simples_anexo5_id, 0, 180000.00, 0.155, 0, 1),                  -- 15.5%
        (v_simples_anexo5_id, 180000.01, 360000.00, 0.18, 4500.00, 2),     -- 18%
        (v_simples_anexo5_id, 360000.01, 720000.00, 0.195, 9900.00, 3),    -- 19.5%
        (v_simples_anexo5_id, 720000.01, 1800000.00, 0.205, 17100.00, 4),  -- 20.5%
        (v_simples_anexo5_id, 1800000.01, 3600000.00, 0.23, 62100.00, 5),  -- 23%
        (v_simples_anexo5_id, 3600000.01, 4800000.00, 0.305, 540000.00, 6); -- 30.5%
    END IF;

    -- ============================================
    -- Lucro Presumido (Aliquotas sobre faturamento)
    -- Carga total: 13,33% a 16,33%
    -- ============================================

    -- IRPJ (4.8% sobre faturamento = 15% de 32%)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, presumption_rate, description)
    VALUES (p_clinic_id, 'lucro_presumido', 'irpj', 'flat', 0.048, 0.32, 'IRPJ - 4,8% s/ faturamento (15% x 32%)')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- IRPJ Adicional (10% sobre lucro presumido > R$20.000/mes)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, presumption_rate, description)
    VALUES (p_clinic_id, 'lucro_presumido', 'irpj_adicional', 'flat', 0.10, 0.32, 'IRPJ Adic. - 10% s/ excedente (lucro > R$20k/mes)')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- CSLL (2.88% sobre faturamento = 9% de 32%)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, presumption_rate, description)
    VALUES (p_clinic_id, 'lucro_presumido', 'csll', 'flat', 0.0288, 0.32, 'CSLL - 2,88% s/ faturamento (9% x 32%)')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- PIS (0.65% sobre receita bruta - cumulativo)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, description)
    VALUES (p_clinic_id, 'lucro_presumido', 'pis', 'flat', 0.0065, 'PIS - 0,65% regime cumulativo')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- COFINS (3% sobre receita bruta - cumulativo)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, description)
    VALUES (p_clinic_id, 'lucro_presumido', 'cofins', 'flat', 0.03, 'COFINS - 3% regime cumulativo')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- ISS (2% a 5% conforme municipio)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, description)
    VALUES (p_clinic_id, 'lucro_presumido', 'iss', 'flat', 0.05, 'ISS - 2% a 5% conforme municipio')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- ============================================
    -- Lucro Real (Para grandes clinicas)
    -- ============================================

    -- IRPJ (15% sobre lucro liquido)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, description)
    VALUES (p_clinic_id, 'lucro_real', 'irpj', 'flat', 0.15, 'IRPJ - 15% sobre lucro liquido')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- IRPJ Adicional (10% sobre excedente de R$20.000/mes)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, description)
    VALUES (p_clinic_id, 'lucro_real', 'irpj_adicional', 'flat', 0.10, 'IRPJ Adicional - 10% s/ lucro > R$20.000/mes')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- CSLL (9% sobre lucro liquido)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, description)
    VALUES (p_clinic_id, 'lucro_real', 'csll', 'flat', 0.09, 'CSLL - 9% sobre lucro liquido')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- PIS/COFINS (9.25% nao-cumulativo com creditos)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, description)
    VALUES (p_clinic_id, 'lucro_real', 'pis', 'flat', 0.0165, 'PIS - 1,65% nao-cumulativo (com creditos)')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, description)
    VALUES (p_clinic_id, 'lucro_real', 'cofins', 'flat', 0.076, 'COFINS - 7,6% nao-cumulativo (com creditos)')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- ISS (2% a 5% conforme municipio)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, description)
    VALUES (p_clinic_id, 'lucro_real', 'iss', 'flat', 0.05, 'ISS - 2% a 5% conforme municipio')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- ============================================
    -- Default ISS Municipal Rate
    -- ============================================
    INSERT INTO iss_municipal_rates (clinic_id, city, state, rate, is_default)
    VALUES (p_clinic_id, 'Padrao', 'XX', 0.05, true)
    ON CONFLICT (clinic_id, city, state) DO NOTHING;

END;
$$;

-- ============================================
-- Trigger to auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_tax_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tax_rate_configurations_updated_at ON tax_rate_configurations;
CREATE TRIGGER tax_rate_configurations_updated_at
    BEFORE UPDATE ON tax_rate_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_tax_config_updated_at();

DROP TRIGGER IF EXISTS tax_rate_brackets_updated_at ON tax_rate_brackets;
CREATE TRIGGER tax_rate_brackets_updated_at
    BEFORE UPDATE ON tax_rate_brackets
    FOR EACH ROW
    EXECUTE FUNCTION update_tax_config_updated_at();

DROP TRIGGER IF EXISTS iss_municipal_rates_updated_at ON iss_municipal_rates;
CREATE TRIGGER iss_municipal_rates_updated_at
    BEFORE UPDATE ON iss_municipal_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_tax_config_updated_at();
