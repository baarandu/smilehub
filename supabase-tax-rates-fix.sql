-- ============================================
-- CORRECOES DE ALIQUOTAS E VALORES
-- Baseado em feedback de revisao tributaria
-- ============================================

-- ============================================
-- 1. CORRECAO: Tabela IRPF 2024 Oficial
-- ============================================
-- A tabela atual estava com valores incorretos.
-- Valores oficiais da Receita Federal 2024:
-- - Ate R$ 2.259,20: Isento
-- - R$ 2.259,21 a R$ 2.826,65: 7,5% (deducao: R$ 169,44)
-- - R$ 2.826,66 a R$ 3.751,05: 15% (deducao: R$ 381,44)
-- - R$ 3.751,06 a R$ 4.664,68: 22,5% (deducao: R$ 662,77)
-- - Acima de R$ 4.664,68: 27,5% (deducao: R$ 896,00)
--
-- NOTA: Com desconto simplificado de R$ 564,80, rendimentos
-- mensais ate ~R$ 2.824,00 podem resultar em isencao pratica.

-- Atualizar descricao do IRPF para PF Carne-Leao
UPDATE tax_rate_configurations
SET description = 'IRPF 2024 - Tabela progressiva mensal oficial. Com desconto simplificado vigente (R$ 564,80), rendimentos ate ~R$ 2.824 podem ter isencao pratica.'
WHERE tax_regime = 'pf_carne_leao'
AND tax_type = 'irpf';

-- Deletar faixas antigas do IRPF
DELETE FROM tax_rate_brackets
WHERE tax_configuration_id IN (
    SELECT id FROM tax_rate_configurations
    WHERE tax_regime = 'pf_carne_leao'
    AND tax_type = 'irpf'
);

-- Inserir faixas corretas IRPF 2024
INSERT INTO tax_rate_brackets (tax_configuration_id, min_value, max_value, rate, deduction, bracket_order)
SELECT
    id,
    min_value,
    max_value,
    rate,
    deduction,
    bracket_order
FROM tax_rate_configurations,
(VALUES
    (0, 2259.20, 0, 0, 1),           -- Isento
    (2259.21, 2826.65, 0.075, 169.44, 2),   -- 7,5%
    (2826.66, 3751.05, 0.15, 381.44, 3),    -- 15%
    (3751.06, 4664.68, 0.225, 662.77, 4),   -- 22,5%
    (4664.69, NULL, 0.275, 896.00, 5)       -- 27,5%
) AS v(min_value, max_value, rate, deduction, bracket_order)
WHERE tax_regime = 'pf_carne_leao'
AND tax_type = 'irpf';

-- ============================================
-- 2. CORRECAO: Descricoes Simples Nacional
-- Deixar claro que sao aliquotas NOMINAIS
-- A efetiva e calculada pela formula
-- ============================================

UPDATE tax_rate_configurations
SET description = 'Anexo III - Fator R >= 28%. Aliquotas NOMINAIS - a efetiva e calculada: (RBT12 x Aliquota - Deducao) / RBT12'
WHERE tax_regime = 'simples'
AND tax_type = 'das';

UPDATE tax_rate_configurations
SET description = 'Anexo V - Fator R < 28%. Aliquotas NOMINAIS - a efetiva e calculada: (RBT12 x Aliquota - Deducao) / RBT12'
WHERE tax_regime = 'simples'
AND tax_type = 'das_anexo_v';

-- ============================================
-- 3. CORRECAO: INSS PF - Adicionar limite teto
-- ============================================

UPDATE tax_rate_configurations
SET description = 'INSS Autonomo - 20% sobre rendimento. Limitado ao teto previdenciario (R$ 1.557,20/mes em 2024).'
WHERE tax_regime = 'pf_carne_leao'
AND tax_type = 'inss';

-- ============================================
-- 4. CORRECAO: Lucro Presumido - Descricoes
-- ============================================

UPDATE tax_rate_configurations
SET description = 'IRPJ - 15% sobre base presumida (32% para servicos). Efetivo: 4,8% sobre faturamento.'
WHERE tax_regime = 'lucro_presumido'
AND tax_type = 'irpj';

UPDATE tax_rate_configurations
SET description = 'IRPJ Adicional - 10% sobre lucro presumido que exceder R$ 20.000/mes (R$ 60.000/trimestre).'
WHERE tax_regime = 'lucro_presumido'
AND tax_type = 'irpj_adicional';

UPDATE tax_rate_configurations
SET description = 'CSLL - 9% sobre base presumida (32% para servicos). Efetivo: 2,88% sobre faturamento.'
WHERE tax_regime = 'lucro_presumido'
AND tax_type = 'csll';

UPDATE tax_rate_configurations
SET description = 'PIS - 0,65% sobre receita bruta (regime cumulativo, sem creditos).'
WHERE tax_regime = 'lucro_presumido'
AND tax_type = 'pis';

UPDATE tax_rate_configurations
SET description = 'COFINS - 3% sobre receita bruta (regime cumulativo, sem creditos).'
WHERE tax_regime = 'lucro_presumido'
AND tax_type = 'cofins';

-- ============================================
-- 5. CORRECAO: Lucro Real - Descricoes PIS/COFINS
-- ============================================

UPDATE tax_rate_configurations
SET description = 'PIS - 1,65% no regime nao-cumulativo (9,25% com COFINS). Permite creditos conforme legislacao.'
WHERE tax_regime = 'lucro_real'
AND tax_type = 'pis';

UPDATE tax_rate_configurations
SET description = 'COFINS - 7,6% no regime nao-cumulativo (9,25% com PIS). Permite creditos conforme legislacao.'
WHERE tax_regime = 'lucro_real'
AND tax_type = 'cofins';

-- ============================================
-- 6. Funcao atualizada para seed com valores corretos
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
    -- PF Autonomo (IRPF 2024 - Tabela Oficial)
    -- ============================================

    -- IRPF Progressive Table 2024
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, description)
    VALUES (p_clinic_id, 'pf_carne_leao', 'irpf', 'progressive',
            'IRPF 2024 - Tabela progressiva mensal oficial. Com desconto simplificado vigente (R$ 564,80), rendimentos ate ~R$ 2.824 podem ter isencao pratica.')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING
    RETURNING id INTO v_irpf_config_id;

    IF v_irpf_config_id IS NOT NULL THEN
        -- IRPF brackets 2024 (valores mensais oficiais)
        INSERT INTO tax_rate_brackets (tax_configuration_id, min_value, max_value, rate, deduction, bracket_order) VALUES
        (v_irpf_config_id, 0, 2259.20, 0, 0, 1),              -- Isento
        (v_irpf_config_id, 2259.21, 2826.65, 0.075, 169.44, 2),   -- 7,5%
        (v_irpf_config_id, 2826.66, 3751.05, 0.15, 381.44, 3),    -- 15%
        (v_irpf_config_id, 3751.06, 4664.68, 0.225, 662.77, 4),   -- 22,5%
        (v_irpf_config_id, 4664.69, NULL, 0.275, 896.00, 5);      -- 27,5%
    END IF;

    -- INSS Autonomo (20% sobre rendimento, limitado ao teto)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, description)
    VALUES (p_clinic_id, 'pf_carne_leao', 'inss', 'flat', 0.20,
            'INSS Autonomo - 20% sobre rendimento. Limitado ao teto previdenciario (R$ 1.557,20/mes em 2024).')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- ISS for PF (2% a 5%)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, description)
    VALUES (p_clinic_id, 'pf_carne_leao', 'iss', 'flat', 0.05, 'ISS - 2% a 5% conforme municipio')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- ============================================
    -- Simples Nacional - Anexo III (Fator R >= 28%)
    -- Aliquotas NOMINAIS - efetiva calculada pela formula
    -- ============================================

    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, description)
    VALUES (p_clinic_id, 'simples', 'das', 'progressive',
            'Anexo III - Fator R >= 28%. Aliquotas NOMINAIS - a efetiva e calculada: (RBT12 x Aliquota - Deducao) / RBT12')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING
    RETURNING id INTO v_simples_anexo3_id;

    IF v_simples_anexo3_id IS NOT NULL THEN
        -- Simples Nacional Anexo III (RBT12 - faturamento ultimos 12 meses)
        INSERT INTO tax_rate_brackets (tax_configuration_id, min_value, max_value, rate, deduction, bracket_order) VALUES
        (v_simples_anexo3_id, 0, 180000.00, 0.06, 0, 1),                 -- 6% nominal (efetiva: 6%)
        (v_simples_anexo3_id, 180000.01, 360000.00, 0.112, 9360.00, 2),  -- 11,2% nominal
        (v_simples_anexo3_id, 360000.01, 720000.00, 0.135, 17640.00, 3), -- 13,5% nominal
        (v_simples_anexo3_id, 720000.01, 1800000.00, 0.16, 35640.00, 4), -- 16% nominal
        (v_simples_anexo3_id, 1800000.01, 3600000.00, 0.21, 125640.00, 5), -- 21% nominal
        (v_simples_anexo3_id, 3600000.01, 4800000.00, 0.33, 648000.00, 6); -- 33% nominal
    END IF;

    -- ============================================
    -- Simples Nacional - Anexo V (Fator R < 28%)
    -- Aliquotas NOMINAIS - efetiva calculada pela formula
    -- ============================================

    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, description)
    VALUES (p_clinic_id, 'simples', 'das_anexo_v', 'progressive',
            'Anexo V - Fator R < 28%. Aliquotas NOMINAIS - a efetiva e calculada: (RBT12 x Aliquota - Deducao) / RBT12')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING
    RETURNING id INTO v_simples_anexo5_id;

    IF v_simples_anexo5_id IS NOT NULL THEN
        -- Simples Nacional Anexo V (RBT12 - faturamento ultimos 12 meses)
        INSERT INTO tax_rate_brackets (tax_configuration_id, min_value, max_value, rate, deduction, bracket_order) VALUES
        (v_simples_anexo5_id, 0, 180000.00, 0.155, 0, 1),                  -- 15,5% nominal
        (v_simples_anexo5_id, 180000.01, 360000.00, 0.18, 4500.00, 2),     -- 18% nominal
        (v_simples_anexo5_id, 360000.01, 720000.00, 0.195, 9900.00, 3),    -- 19,5% nominal
        (v_simples_anexo5_id, 720000.01, 1800000.00, 0.205, 17100.00, 4),  -- 20,5% nominal
        (v_simples_anexo5_id, 1800000.01, 3600000.00, 0.23, 62100.00, 5),  -- 23% nominal
        (v_simples_anexo5_id, 3600000.01, 4800000.00, 0.305, 540000.00, 6); -- 30,5% nominal
    END IF;

    -- ============================================
    -- Lucro Presumido
    -- Carga tipica: 13,33% (ISS 2%) a 16,33% (ISS 5%)
    -- ============================================

    -- IRPJ (15% sobre base presumida de 32% = 4,8% sobre faturamento)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, presumption_rate, description)
    VALUES (p_clinic_id, 'lucro_presumido', 'irpj', 'flat', 0.15, 0.32,
            'IRPJ - 15% sobre base presumida (32% para servicos). Efetivo: 4,8% sobre faturamento.')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- IRPJ Adicional (10% sobre lucro presumido > R$20.000/mes)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, presumption_rate, description)
    VALUES (p_clinic_id, 'lucro_presumido', 'irpj_adicional', 'flat', 0.10, 0.32,
            'IRPJ Adicional - 10% sobre lucro presumido que exceder R$ 20.000/mes (R$ 60.000/trimestre).')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- CSLL (9% sobre base presumida de 32% = 2,88% sobre faturamento)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, presumption_rate, description)
    VALUES (p_clinic_id, 'lucro_presumido', 'csll', 'flat', 0.09, 0.32,
            'CSLL - 9% sobre base presumida (32% para servicos). Efetivo: 2,88% sobre faturamento.')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- PIS (0.65% sobre receita bruta - cumulativo)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, description)
    VALUES (p_clinic_id, 'lucro_presumido', 'pis', 'flat', 0.0065,
            'PIS - 0,65% sobre receita bruta (regime cumulativo, sem creditos).')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- COFINS (3% sobre receita bruta - cumulativo)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, description)
    VALUES (p_clinic_id, 'lucro_presumido', 'cofins', 'flat', 0.03,
            'COFINS - 3% sobre receita bruta (regime cumulativo, sem creditos).')
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
    VALUES (p_clinic_id, 'lucro_real', 'irpj', 'flat', 0.15, 'IRPJ - 15% sobre lucro liquido real')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- IRPJ Adicional (10% sobre excedente de R$20.000/mes)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, description)
    VALUES (p_clinic_id, 'lucro_real', 'irpj_adicional', 'flat', 0.10,
            'IRPJ Adicional - 10% sobre lucro real que exceder R$ 20.000/mes')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- CSLL (9% sobre lucro liquido)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, description)
    VALUES (p_clinic_id, 'lucro_real', 'csll', 'flat', 0.09, 'CSLL - 9% sobre lucro liquido real')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- PIS (1.65% - regime nao-cumulativo)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, description)
    VALUES (p_clinic_id, 'lucro_real', 'pis', 'flat', 0.0165,
            'PIS - 1,65% no regime nao-cumulativo (9,25% com COFINS). Permite creditos conforme legislacao.')
    ON CONFLICT (clinic_id, tax_regime, tax_type, effective_from) DO NOTHING;

    -- COFINS (7.6% - regime nao-cumulativo)
    INSERT INTO tax_rate_configurations (clinic_id, tax_regime, tax_type, rate_type, flat_rate, description)
    VALUES (p_clinic_id, 'lucro_real', 'cofins', 'flat', 0.076,
            'COFINS - 7,6% no regime nao-cumulativo (9,25% com PIS). Permite creditos conforme legislacao.')
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
