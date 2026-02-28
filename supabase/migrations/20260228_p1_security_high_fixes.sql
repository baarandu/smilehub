-- =============================================================
-- P1 Security High Fixes
-- Created: 2026-02-28
-- Fixes: P1.5 (accounting SECURITY DEFINER auth), P1.8 (indexes)
-- =============================================================

-- =============================================================
-- P1.5: Accounting SECURITY DEFINER functions without clinic auth
-- calculate_factor_r, calculate_simples_tax, validate_bookkeeping,
-- get_monthly_summary accept p_clinic_id without verifying membership.
-- Fix: Recreate with auth.uid() check against clinic_users.
-- =============================================================

CREATE OR REPLACE FUNCTION calculate_factor_r(
    p_clinic_id uuid,
    p_start_date date,
    p_end_date date
) RETURNS jsonb AS $$
DECLARE
    v_revenue numeric;
    v_payroll numeric;
    v_factor_r numeric;
    v_anexo text;
    v_anexo_number integer;
BEGIN
    -- Verify caller belongs to the clinic
    IF NOT EXISTS (
        SELECT 1 FROM clinic_users
        WHERE user_id = auth.uid() AND clinic_id = p_clinic_id
    ) THEN
        RAISE EXCEPTION 'Acesso negado: você não pertence a esta clínica.';
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_revenue
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND type = 'income'
      AND date BETWEEN p_start_date AND p_end_date;

    SELECT COALESCE(SUM(amount), 0) INTO v_payroll
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND type = 'expense'
      AND category IN ('salarios', 'pro_labore', 'encargos_trabalhistas', 'beneficios')
      AND date BETWEEN p_start_date AND p_end_date;

    IF v_revenue > 0 THEN
        v_factor_r := (v_payroll / v_revenue);
    ELSE
        v_factor_r := 0;
    END IF;

    IF v_factor_r >= 0.28 THEN
        v_anexo := 'Anexo III (mais vantajoso - alíquotas menores)';
        v_anexo_number := 3;
    ELSE
        v_anexo := 'Anexo V (menos vantajoso - alíquotas maiores)';
        v_anexo_number := 5;
    END IF;

    RETURN jsonb_build_object(
        'faturamento_12m', ROUND(v_revenue, 2),
        'folha_12m', ROUND(v_payroll, 2),
        'fator_r', ROUND(v_factor_r, 4),
        'fator_r_percent', ROUND(v_factor_r * 100, 2),
        'anexo_recomendado', v_anexo,
        'anexo_number', v_anexo_number,
        'periodo', jsonb_build_object(
            'inicio', p_start_date,
            'fim', p_end_date
        ),
        'status', CASE
            WHEN v_factor_r >= 0.28 THEN 'bom'
            WHEN v_factor_r >= 0.25 THEN 'atencao'
            ELSE 'critico'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION calculate_simples_tax(
    p_clinic_id uuid,
    p_month date,
    p_anexo integer DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
    v_monthly_revenue numeric;
    v_accumulated_12m numeric;
    v_aliquota numeric;
    v_deducao numeric;
    v_das numeric;
    v_faixa text;
    v_calculated_anexo integer;
BEGIN
    -- Verify caller belongs to the clinic
    IF NOT EXISTS (
        SELECT 1 FROM clinic_users
        WHERE user_id = auth.uid() AND clinic_id = p_clinic_id
    ) THEN
        RAISE EXCEPTION 'Acesso negado: você não pertence a esta clínica.';
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_monthly_revenue
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND type = 'income'
      AND date_trunc('month', date) = date_trunc('month', p_month);

    SELECT COALESCE(SUM(amount), 0) INTO v_accumulated_12m
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND type = 'income'
      AND date >= (date_trunc('month', p_month) - interval '12 months')
      AND date < date_trunc('month', p_month);

    IF p_anexo IS NULL THEN
        SELECT (result->>'anexo_number')::integer INTO v_calculated_anexo
        FROM calculate_factor_r(
            p_clinic_id,
            (date_trunc('month', p_month) - interval '12 months')::date,
            (date_trunc('month', p_month) - interval '1 day')::date
        ) AS result;
        p_anexo := COALESCE(v_calculated_anexo, 3);
    END IF;

    IF p_anexo = 3 THEN
        IF v_accumulated_12m <= 180000 THEN
            v_aliquota := 0.06; v_deducao := 0; v_faixa := 'Até R$ 180.000';
        ELSIF v_accumulated_12m <= 360000 THEN
            v_aliquota := 0.112; v_deducao := 9360; v_faixa := 'R$ 180.000 a R$ 360.000';
        ELSIF v_accumulated_12m <= 720000 THEN
            v_aliquota := 0.135; v_deducao := 17640; v_faixa := 'R$ 360.000 a R$ 720.000';
        ELSIF v_accumulated_12m <= 1800000 THEN
            v_aliquota := 0.16; v_deducao := 35640; v_faixa := 'R$ 720.000 a R$ 1.800.000';
        ELSIF v_accumulated_12m <= 3600000 THEN
            v_aliquota := 0.21; v_deducao := 125640; v_faixa := 'R$ 1.800.000 a R$ 3.600.000';
        ELSE
            v_aliquota := 0.33; v_deducao := 648000; v_faixa := 'R$ 3.600.000 a R$ 4.800.000';
        END IF;
    ELSE
        IF v_accumulated_12m <= 180000 THEN
            v_aliquota := 0.155; v_deducao := 0; v_faixa := 'Até R$ 180.000';
        ELSIF v_accumulated_12m <= 360000 THEN
            v_aliquota := 0.18; v_deducao := 4500; v_faixa := 'R$ 180.000 a R$ 360.000';
        ELSIF v_accumulated_12m <= 720000 THEN
            v_aliquota := 0.195; v_deducao := 9900; v_faixa := 'R$ 360.000 a R$ 720.000';
        ELSIF v_accumulated_12m <= 1800000 THEN
            v_aliquota := 0.205; v_deducao := 17100; v_faixa := 'R$ 720.000 a R$ 1.800.000';
        ELSIF v_accumulated_12m <= 3600000 THEN
            v_aliquota := 0.23; v_deducao := 62100; v_faixa := 'R$ 1.800.000 a R$ 3.600.000';
        ELSE
            v_aliquota := 0.305; v_deducao := 540000; v_faixa := 'R$ 3.600.000 a R$ 4.800.000';
        END IF;
    END IF;

    v_das := (v_monthly_revenue * v_aliquota) - (v_deducao / 12);
    IF v_das < 0 THEN v_das := 0; END IF;

    RETURN jsonb_build_object(
        'mes', p_month,
        'receita_mes', ROUND(v_monthly_revenue, 2),
        'receita_acumulada_12m', ROUND(v_accumulated_12m, 2),
        'anexo', p_anexo,
        'anexo_nome', CASE WHEN p_anexo = 3 THEN 'Anexo III' ELSE 'Anexo V' END,
        'faixa', v_faixa,
        'aliquota_nominal', ROUND(v_aliquota * 100, 2),
        'deducao_mensal', ROUND(v_deducao / 12, 2),
        'das_calculado', ROUND(v_das, 2),
        'aliquota_efetiva', CASE
            WHEN v_monthly_revenue > 0
            THEN ROUND((v_das / v_monthly_revenue) * 100, 2)
            ELSE 0
        END,
        'vencimento', (date_trunc('month', p_month) + interval '1 month' + interval '19 days')::date
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION validate_bookkeeping(
    p_clinic_id uuid,
    p_month date
) RETURNS jsonb AS $$
DECLARE
    v_issues jsonb := '[]'::jsonb;
    v_count integer;
    v_details jsonb;
BEGIN
    -- Verify caller belongs to the clinic
    IF NOT EXISTS (
        SELECT 1 FROM clinic_users
        WHERE user_id = auth.uid() AND clinic_id = p_clinic_id
    ) THEN
        RAISE EXCEPTION 'Acesso negado: você não pertence a esta clínica.';
    END IF;

    -- Issue 1: Transactions without category
    SELECT COUNT(*), jsonb_agg(jsonb_build_object(
        'id', id, 'date', date, 'description', description, 'amount', amount
    ))
    INTO v_count, v_details
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND date_trunc('month', date) = date_trunc('month', p_month)
      AND (category IS NULL OR category = '' OR category = 'outros')
    LIMIT 10;

    IF v_count > 0 THEN
        v_issues := v_issues || jsonb_build_object(
            'type', 'sem_categoria', 'severity', 'high', 'count', v_count,
            'message', format('%s transações sem categoria definida', v_count),
            'details', COALESCE(v_details, '[]'::jsonb)
        );
    END IF;

    -- Issue 2: Expenses without receipt
    SELECT COUNT(*), jsonb_agg(jsonb_build_object(
        'id', id, 'date', date, 'description', description, 'amount', amount, 'supplier_name', supplier_name
    ))
    INTO v_count, v_details
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND date_trunc('month', date) = date_trunc('month', p_month)
      AND type = 'expense'
      AND (receipt_attachment_url IS NULL OR receipt_attachment_url = '')
    LIMIT 10;

    IF v_count > 0 THEN
        v_issues := v_issues || jsonb_build_object(
            'type', 'sem_comprovante', 'severity', 'medium', 'count', v_count,
            'message', format('%s despesas sem comprovante anexado', v_count),
            'details', COALESCE(v_details, '[]'::jsonb)
        );
    END IF;

    -- Issue 3: Possible duplicates
    WITH duplicates AS (
        SELECT amount, date, COALESCE(supplier_name, 'Sem fornecedor') as supplier, COUNT(*) as cnt,
            jsonb_agg(jsonb_build_object('id', id, 'description', description)) as transactions
        FROM financial_transactions
        WHERE clinic_id = p_clinic_id
          AND date_trunc('month', date) = date_trunc('month', p_month)
        GROUP BY amount, date, supplier_name
        HAVING COUNT(*) > 1
    )
    SELECT COUNT(*), jsonb_agg(jsonb_build_object(
        'amount', amount, 'date', date, 'supplier', supplier, 'count', cnt, 'transactions', transactions
    ))
    INTO v_count, v_details
    FROM duplicates
    LIMIT 10;

    IF v_count > 0 THEN
        v_issues := v_issues || jsonb_build_object(
            'type', 'duplicidade', 'severity', 'high', 'count', v_count,
            'message', format('%s grupos de possíveis duplicatas detectadas', v_count),
            'details', COALESCE(v_details, '[]'::jsonb)
        );
    END IF;

    -- Issue 4: Zero or negative amounts
    SELECT COUNT(*), jsonb_agg(jsonb_build_object(
        'id', id, 'date', date, 'description', description, 'amount', amount
    ))
    INTO v_count, v_details
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND date_trunc('month', date) = date_trunc('month', p_month)
      AND amount <= 0
    LIMIT 10;

    IF v_count > 0 THEN
        v_issues := v_issues || jsonb_build_object(
            'type', 'valor_invalido', 'severity', 'medium', 'count', v_count,
            'message', format('%s transações com valor zero ou negativo', v_count),
            'details', COALESCE(v_details, '[]'::jsonb)
        );
    END IF;

    -- Issue 5: Missing description
    SELECT COUNT(*), jsonb_agg(jsonb_build_object(
        'id', id, 'date', date, 'amount', amount, 'category', category
    ))
    INTO v_count, v_details
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND date_trunc('month', date) = date_trunc('month', p_month)
      AND (description IS NULL OR description = '' OR LENGTH(description) < 3)
    LIMIT 10;

    IF v_count > 0 THEN
        v_issues := v_issues || jsonb_build_object(
            'type', 'sem_descricao', 'severity', 'low', 'count', v_count,
            'message', format('%s transações sem descrição adequada', v_count),
            'details', COALESCE(v_details, '[]'::jsonb)
        );
    END IF;

    RETURN jsonb_build_object(
        'mes', p_month,
        'total_issues', jsonb_array_length(v_issues),
        'issues', v_issues,
        'status', CASE
            WHEN jsonb_array_length(v_issues) = 0 THEN 'aprovado'
            WHEN jsonb_array_length(v_issues) <= 2 THEN 'atencao'
            ELSE 'pendente'
        END,
        'checked_at', now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION get_monthly_summary(
    p_clinic_id uuid,
    p_month date
) RETURNS jsonb AS $$
DECLARE
    v_revenue numeric;
    v_expenses numeric;
    v_profit numeric;
    v_expenses_by_category jsonb;
    v_revenue_by_source jsonb;
BEGIN
    -- Verify caller belongs to the clinic
    IF NOT EXISTS (
        SELECT 1 FROM clinic_users
        WHERE user_id = auth.uid() AND clinic_id = p_clinic_id
    ) THEN
        RAISE EXCEPTION 'Acesso negado: você não pertence a esta clínica.';
    END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_revenue
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND type = 'income'
      AND date_trunc('month', date) = date_trunc('month', p_month);

    SELECT COALESCE(SUM(amount), 0) INTO v_expenses
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND type = 'expense'
      AND date_trunc('month', date) = date_trunc('month', p_month);

    v_profit := v_revenue - v_expenses;

    SELECT jsonb_agg(jsonb_build_object(
        'category', COALESCE(category, 'outros'),
        'total', ROUND(total, 2),
        'percentage', ROUND((total / NULLIF(v_expenses, 0)) * 100, 2)
    ) ORDER BY total DESC)
    INTO v_expenses_by_category
    FROM (
        SELECT category, SUM(amount) as total
        FROM financial_transactions
        WHERE clinic_id = p_clinic_id
          AND type = 'expense'
          AND date_trunc('month', date) = date_trunc('month', p_month)
        GROUP BY category
    ) sub;

    SELECT jsonb_agg(jsonb_build_object(
        'source', COALESCE(payment_method, 'outros'),
        'total', ROUND(total, 2),
        'percentage', ROUND((total / NULLIF(v_revenue, 0)) * 100, 2)
    ) ORDER BY total DESC)
    INTO v_revenue_by_source
    FROM (
        SELECT payment_method, SUM(amount) as total
        FROM financial_transactions
        WHERE clinic_id = p_clinic_id
          AND type = 'income'
          AND date_trunc('month', date) = date_trunc('month', p_month)
        GROUP BY payment_method
    ) sub;

    RETURN jsonb_build_object(
        'mes', p_month,
        'receita_bruta', ROUND(v_revenue, 2),
        'despesas_totais', ROUND(v_expenses, 2),
        'lucro_liquido', ROUND(v_profit, 2),
        'margem_liquida', CASE
            WHEN v_revenue > 0 THEN ROUND((v_profit / v_revenue) * 100, 2)
            ELSE 0
        END,
        'despesas_por_categoria', COALESCE(v_expenses_by_category, '[]'::jsonb),
        'receita_por_fonte', COALESCE(v_revenue_by_source, '[]'::jsonb),
        'status', CASE
            WHEN v_profit > 0 THEN 'lucrativo'
            WHEN v_profit = 0 THEN 'equilibrio'
            ELSE 'prejuizo'
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================
-- P1.8: Missing indexes on core tables
-- Create indexes on frequently queried columns.
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_ft_clinic_id ON financial_transactions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ft_type ON financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_ft_patient_id ON financial_transactions(patient_id);
CREATE INDEX IF NOT EXISTS idx_ft_date ON financial_transactions(date);
CREATE INDEX IF NOT EXISTS idx_ft_clinic_type_date ON financial_transactions(clinic_id, type, date);

CREATE INDEX IF NOT EXISTS idx_budgets_clinic_id ON budgets(clinic_id);
CREATE INDEX IF NOT EXISTS idx_budgets_patient_id ON budgets(patient_id);

CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON budget_items(budget_id);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_patient ON appointments(clinic_id, patient_id);

CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON patients(clinic_id);

CREATE INDEX IF NOT EXISTS idx_consultations_patient_id ON consultations(patient_id);

CREATE INDEX IF NOT EXISTS idx_exams_patient_id ON exams(patient_id);
CREATE INDEX IF NOT EXISTS idx_exams_clinic_id ON exams(clinic_id);

CREATE INDEX IF NOT EXISTS idx_anamneses_patient_id ON anamneses(patient_id);

CREATE INDEX IF NOT EXISTS idx_procedures_patient_id ON procedures(patient_id);
CREATE INDEX IF NOT EXISTS idx_procedures_clinic_id ON procedures(clinic_id);

CREATE INDEX IF NOT EXISTS idx_fiscal_documents_clinic_id ON fiscal_documents(clinic_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_clinic_id ON subscriptions(clinic_id);

CREATE INDEX IF NOT EXISTS idx_shopping_orders_clinic_id ON shopping_orders(clinic_id);

CREATE INDEX IF NOT EXISTS idx_locations_clinic_id ON locations(clinic_id);
