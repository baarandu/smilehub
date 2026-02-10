-- =====================================================
-- Migration: Accounting Agent Tables and Functions
-- Created: 2026-02-10
-- Purpose: Create infrastructure for AI accounting agent
-- =====================================================

-- =====================================================
-- PART 1: Tables
-- =====================================================

-- Conversations table
CREATE TABLE IF NOT EXISTS accounting_agent_conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_message_at timestamptz DEFAULT now(),
    message_count integer DEFAULT 0,
    tool_calls_count integer DEFAULT 0
);

-- Messages table
CREATE TABLE IF NOT EXISTS accounting_agent_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES accounting_agent_conversations(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
    content text NOT NULL,
    tool_calls jsonb,
    tool_call_id text,
    tool_name text,
    created_at timestamptz DEFAULT now(),
    tokens_used integer DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_conversations_clinic_id ON accounting_agent_conversations(clinic_id);
CREATE INDEX idx_conversations_user_id ON accounting_agent_conversations(user_id);
CREATE INDEX idx_conversations_last_message ON accounting_agent_conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation_id ON accounting_agent_messages(conversation_id);
CREATE INDEX idx_messages_created_at ON accounting_agent_messages(created_at);

-- =====================================================
-- PART 2: Row Level Security (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE accounting_agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_agent_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Admins can view their clinic's conversations"
    ON accounting_agent_conversations FOR SELECT
    USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can create conversations for their clinic"
    ON accounting_agent_conversations FOR INSERT
    WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid() AND role = 'admin'
        )
        AND user_id = auth.uid()
    );

CREATE POLICY "Admins can update their clinic's conversations"
    ON accounting_agent_conversations FOR UPDATE
    USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for messages
CREATE POLICY "Admins can view messages from their clinic's conversations"
    ON accounting_agent_messages FOR SELECT
    USING (
        conversation_id IN (
            SELECT id FROM accounting_agent_conversations
            WHERE clinic_id IN (
                SELECT clinic_id FROM clinic_users
                WHERE user_id = auth.uid() AND role = 'admin'
            )
        )
    );

CREATE POLICY "Admins can create messages in their clinic's conversations"
    ON accounting_agent_messages FOR INSERT
    WITH CHECK (
        conversation_id IN (
            SELECT id FROM accounting_agent_conversations
            WHERE clinic_id IN (
                SELECT clinic_id FROM clinic_users
                WHERE user_id = auth.uid() AND role = 'admin'
            )
        )
    );

-- =====================================================
-- PART 3: Triggers
-- =====================================================

-- Trigger to update conversation metadata when messages are added
CREATE OR REPLACE FUNCTION update_conversation_metadata()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE accounting_agent_conversations
    SET
        updated_at = now(),
        last_message_at = now(),
        message_count = message_count + 1,
        tool_calls_count = tool_calls_count + CASE
            WHEN NEW.tool_calls IS NOT NULL THEN jsonb_array_length(NEW.tool_calls)
            ELSE 0
        END
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_conversation_on_message_insert
    AFTER INSERT ON accounting_agent_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_metadata();

-- =====================================================
-- PART 4: Deterministic SQL Functions (Core Logic)
-- =====================================================

-- Function 1: Calculate Factor R (for Simples Nacional)
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
    -- Calculate revenue for 12 months
    SELECT COALESCE(SUM(amount), 0) INTO v_revenue
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND type = 'income'
      AND date BETWEEN p_start_date AND p_end_date;

    -- Calculate payroll for 12 months
    -- Categories that count as payroll: salaries, benefits, pro_labore, taxes_on_payroll
    SELECT COALESCE(SUM(amount), 0) INTO v_payroll
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND type = 'expense'
      AND category IN ('salarios', 'pro_labore', 'encargos_trabalhistas', 'beneficios')
      AND date BETWEEN p_start_date AND p_end_date;

    -- Calculate Factor R
    IF v_revenue > 0 THEN
        v_factor_r := (v_payroll / v_revenue);
    ELSE
        v_factor_r := 0;
    END IF;

    -- Determine anexo (≥28% = Anexo III, <28% = Anexo V)
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

-- Function 2: Calculate Simples Nacional Tax (DAS)
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
    -- Get revenue for the month
    SELECT COALESCE(SUM(amount), 0) INTO v_monthly_revenue
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND type = 'income'
      AND date_trunc('month', date) = date_trunc('month', p_month);

    -- Get accumulated revenue for 12 months (before the target month)
    SELECT COALESCE(SUM(amount), 0) INTO v_accumulated_12m
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND type = 'income'
      AND date >= (date_trunc('month', p_month) - interval '12 months')
      AND date < date_trunc('month', p_month);

    -- If anexo not specified, calculate it
    IF p_anexo IS NULL THEN
        SELECT (result->>'anexo_number')::integer INTO v_calculated_anexo
        FROM calculate_factor_r(
            p_clinic_id,
            (date_trunc('month', p_month) - interval '12 months')::date,
            (date_trunc('month', p_month) - interval '1 day')::date
        ) AS result;
        p_anexo := COALESCE(v_calculated_anexo, 3);
    END IF;

    -- Determine tax bracket and rates based on anexo
    IF p_anexo = 3 THEN
        -- Anexo III - Serviços (with Factor R ≥ 28%)
        IF v_accumulated_12m <= 180000 THEN
            v_aliquota := 0.06;
            v_deducao := 0;
            v_faixa := 'Até R$ 180.000';
        ELSIF v_accumulated_12m <= 360000 THEN
            v_aliquota := 0.112;
            v_deducao := 9360;
            v_faixa := 'R$ 180.000 a R$ 360.000';
        ELSIF v_accumulated_12m <= 720000 THEN
            v_aliquota := 0.135;
            v_deducao := 17640;
            v_faixa := 'R$ 360.000 a R$ 720.000';
        ELSIF v_accumulated_12m <= 1800000 THEN
            v_aliquota := 0.16;
            v_deducao := 35640;
            v_faixa := 'R$ 720.000 a R$ 1.800.000';
        ELSIF v_accumulated_12m <= 3600000 THEN
            v_aliquota := 0.21;
            v_deducao := 125640;
            v_faixa := 'R$ 1.800.000 a R$ 3.600.000';
        ELSE
            v_aliquota := 0.33;
            v_deducao := 648000;
            v_faixa := 'R$ 3.600.000 a R$ 4.800.000';
        END IF;
    ELSE
        -- Anexo V - Serviços (with Factor R < 28%)
        IF v_accumulated_12m <= 180000 THEN
            v_aliquota := 0.155;
            v_deducao := 0;
            v_faixa := 'Até R$ 180.000';
        ELSIF v_accumulated_12m <= 360000 THEN
            v_aliquota := 0.18;
            v_deducao := 4500;
            v_faixa := 'R$ 180.000 a R$ 360.000';
        ELSIF v_accumulated_12m <= 720000 THEN
            v_aliquota := 0.195;
            v_deducao := 9900;
            v_faixa := 'R$ 360.000 a R$ 720.000';
        ELSIF v_accumulated_12m <= 1800000 THEN
            v_aliquota := 0.205;
            v_deducao := 17100;
            v_faixa := 'R$ 720.000 a R$ 1.800.000';
        ELSIF v_accumulated_12m <= 3600000 THEN
            v_aliquota := 0.23;
            v_deducao := 62100;
            v_faixa := 'R$ 1.800.000 a R$ 3.600.000';
        ELSE
            v_aliquota := 0.305;
            v_deducao := 540000;
            v_faixa := 'R$ 3.600.000 a R$ 4.800.000';
        END IF;
    END IF;

    -- Calculate DAS (monthly tax)
    v_das := (v_monthly_revenue * v_aliquota) - (v_deducao / 12);
    IF v_das < 0 THEN
        v_das := 0;
    END IF;

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

-- Function 3: Validate Bookkeeping (audit month)
CREATE OR REPLACE FUNCTION validate_bookkeeping(
    p_clinic_id uuid,
    p_month date
) RETURNS jsonb AS $$
DECLARE
    v_issues jsonb := '[]'::jsonb;
    v_count integer;
    v_details jsonb;
BEGIN
    -- Issue 1: Transactions without category
    SELECT COUNT(*), jsonb_agg(jsonb_build_object(
        'id', id,
        'date', date,
        'description', description,
        'amount', amount
    ))
    INTO v_count, v_details
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND date_trunc('month', date) = date_trunc('month', p_month)
      AND (category IS NULL OR category = '' OR category = 'outros')
    LIMIT 10;

    IF v_count > 0 THEN
        v_issues := v_issues || jsonb_build_object(
            'type', 'sem_categoria',
            'severity', 'high',
            'count', v_count,
            'message', format('%s transações sem categoria definida', v_count),
            'details', COALESCE(v_details, '[]'::jsonb)
        );
    END IF;

    -- Issue 2: Expenses without receipt
    SELECT COUNT(*), jsonb_agg(jsonb_build_object(
        'id', id,
        'date', date,
        'description', description,
        'amount', amount,
        'supplier_name', supplier_name
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
            'type', 'sem_comprovante',
            'severity', 'medium',
            'count', v_count,
            'message', format('%s despesas sem comprovante anexado', v_count),
            'details', COALESCE(v_details, '[]'::jsonb)
        );
    END IF;

    -- Issue 3: Possible duplicates (same amount, same date, same supplier)
    WITH duplicates AS (
        SELECT
            amount,
            date,
            COALESCE(supplier_name, 'Sem fornecedor') as supplier,
            COUNT(*) as cnt,
            jsonb_agg(jsonb_build_object(
                'id', id,
                'description', description
            )) as transactions
        FROM financial_transactions
        WHERE clinic_id = p_clinic_id
          AND date_trunc('month', date) = date_trunc('month', p_month)
        GROUP BY amount, date, supplier_name
        HAVING COUNT(*) > 1
    )
    SELECT COUNT(*), jsonb_agg(jsonb_build_object(
        'amount', amount,
        'date', date,
        'supplier', supplier,
        'count', cnt,
        'transactions', transactions
    ))
    INTO v_count, v_details
    FROM duplicates
    LIMIT 10;

    IF v_count > 0 THEN
        v_issues := v_issues || jsonb_build_object(
            'type', 'duplicidade',
            'severity', 'high',
            'count', v_count,
            'message', format('%s grupos de possíveis duplicatas detectadas', v_count),
            'details', COALESCE(v_details, '[]'::jsonb)
        );
    END IF;

    -- Issue 4: Transactions with zero or negative amount
    SELECT COUNT(*), jsonb_agg(jsonb_build_object(
        'id', id,
        'date', date,
        'description', description,
        'amount', amount
    ))
    INTO v_count, v_details
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND date_trunc('month', date) = date_trunc('month', p_month)
      AND amount <= 0
    LIMIT 10;

    IF v_count > 0 THEN
        v_issues := v_issues || jsonb_build_object(
            'type', 'valor_invalido',
            'severity', 'medium',
            'count', v_count,
            'message', format('%s transações com valor zero ou negativo', v_count),
            'details', COALESCE(v_details, '[]'::jsonb)
        );
    END IF;

    -- Issue 5: Transactions without description
    SELECT COUNT(*), jsonb_agg(jsonb_build_object(
        'id', id,
        'date', date,
        'amount', amount,
        'category', category
    ))
    INTO v_count, v_details
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND date_trunc('month', date) = date_trunc('month', p_month)
      AND (description IS NULL OR description = '' OR LENGTH(description) < 3)
    LIMIT 10;

    IF v_count > 0 THEN
        v_issues := v_issues || jsonb_build_object(
            'type', 'sem_descricao',
            'severity', 'low',
            'count', v_count,
            'message', format('%s transações sem descrição adequada', v_count),
            'details', COALESCE(v_details, '[]'::jsonb)
        );
    END IF;

    -- Return results
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

-- Function 4: Get Monthly Summary (DRE simplified)
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
    -- Total revenue
    SELECT COALESCE(SUM(amount), 0) INTO v_revenue
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND type = 'income'
      AND date_trunc('month', date) = date_trunc('month', p_month);

    -- Total expenses
    SELECT COALESCE(SUM(amount), 0) INTO v_expenses
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND type = 'expense'
      AND date_trunc('month', date) = date_trunc('month', p_month);

    -- Profit
    v_profit := v_revenue - v_expenses;

    -- Expenses by category
    SELECT jsonb_agg(jsonb_build_object(
        'category', COALESCE(category, 'outros'),
        'total', ROUND(total, 2),
        'percentage', ROUND((total / NULLIF(v_expenses, 0)) * 100, 2)
    ) ORDER BY total DESC)
    INTO v_expenses_by_category
    FROM (
        SELECT
            category,
            SUM(amount) as total
        FROM financial_transactions
        WHERE clinic_id = p_clinic_id
          AND type = 'expense'
          AND date_trunc('month', date) = date_trunc('month', p_month)
        GROUP BY category
    ) sub;

    -- Revenue by source (if we have payment methods or sources)
    SELECT jsonb_agg(jsonb_build_object(
        'source', COALESCE(payment_method, 'outros'),
        'total', ROUND(total, 2),
        'percentage', ROUND((total / NULLIF(v_revenue, 0)) * 100, 2)
    ) ORDER BY total DESC)
    INTO v_revenue_by_source
    FROM (
        SELECT
            payment_method,
            SUM(amount) as total
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
            WHEN v_revenue > 0
            THEN ROUND((v_profit / v_revenue) * 100, 2)
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

-- =====================================================
-- PART 5: Grant permissions
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION calculate_factor_r TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_simples_tax TO authenticated;
GRANT EXECUTE ON FUNCTION validate_bookkeeping TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_summary TO authenticated;

-- =====================================================
-- PART 6: Comments
-- =====================================================

COMMENT ON TABLE accounting_agent_conversations IS 'Stores conversations between users and the accounting AI agent';
COMMENT ON TABLE accounting_agent_messages IS 'Stores individual messages within conversations';
COMMENT ON FUNCTION calculate_factor_r IS 'Calculates Factor R for Simples Nacional (payroll/revenue ratio)';
COMMENT ON FUNCTION calculate_simples_tax IS 'Calculates DAS (Simples Nacional monthly tax)';
COMMENT ON FUNCTION validate_bookkeeping IS 'Audits monthly transactions for common issues';
COMMENT ON FUNCTION get_monthly_summary IS 'Generates simplified income statement (DRE) for a month';
