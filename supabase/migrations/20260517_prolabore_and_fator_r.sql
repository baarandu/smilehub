-- ============================================================
-- Pró-labore Withdrawals + Fator R Monitoring
-- Permite rastrear retiradas mensais dos sócios e monitorar
-- o Fator R do Simples Nacional (≥28% mantém Anexo III).
-- ============================================================

-- 1) Tabela de retiradas de pró-labore
CREATE TABLE IF NOT EXISTS public.prolabore_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,

  -- Sócio recebendo (pode ser usuário do sistema OU nome livre)
  partner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  partner_name text NOT NULL, -- snapshot do nome (caso o usuário seja removido)
  partner_cpf text,           -- para emissão de recibo

  -- Período de competência (1º dia do mês)
  reference_month date NOT NULL,

  -- Valores
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  inss_amount numeric(12,2) DEFAULT 0 CHECK (inss_amount >= 0),
  irrf_amount numeric(12,2) DEFAULT 0 CHECK (irrf_amount >= 0),
  net_amount numeric(12,2), -- líquido (amount - inss - irrf)

  -- Pagamento efetivo
  payment_date date,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'paid', 'canceled')),

  -- Vínculo opcional com transação financeira (despesa criada automaticamente)
  financial_transaction_id uuid REFERENCES public.financial_transactions(id) ON DELETE SET NULL,

  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Índices
CREATE INDEX IF NOT EXISTS idx_prolabore_clinic_month
  ON public.prolabore_withdrawals (clinic_id, reference_month DESC, status);

CREATE INDEX IF NOT EXISTS idx_prolabore_partner
  ON public.prolabore_withdrawals (partner_user_id)
  WHERE partner_user_id IS NOT NULL;

-- Único: um pró-labore por sócio por mês (substituição via UPDATE)
CREATE UNIQUE INDEX IF NOT EXISTS idx_prolabore_unique_partner_month
  ON public.prolabore_withdrawals (clinic_id, partner_user_id, reference_month)
  WHERE partner_user_id IS NOT NULL AND status != 'canceled';

-- 3) RLS — escopo por clínica
ALTER TABLE public.prolabore_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prolabore_select_own_clinic"
  ON public.prolabore_withdrawals FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "prolabore_insert_own_clinic"
  ON public.prolabore_withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "prolabore_update_own_clinic"
  ON public.prolabore_withdrawals FOR UPDATE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "prolabore_delete_own_clinic"
  ON public.prolabore_withdrawals FOR DELETE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
    )
  );

-- 4) Trigger updated_at + net_amount auto-calc + reference_month normalization
CREATE OR REPLACE FUNCTION _prolabore_normalize()
RETURNS trigger AS $$
BEGIN
  -- Garantir que reference_month seja sempre o 1º dia
  NEW.reference_month := date_trunc('month', NEW.reference_month)::date;
  -- Calcular net automaticamente se não fornecido
  IF NEW.net_amount IS NULL THEN
    NEW.net_amount := NEW.amount - COALESCE(NEW.inss_amount, 0) - COALESCE(NEW.irrf_amount, 0);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prolabore_normalize ON public.prolabore_withdrawals;
CREATE TRIGGER trg_prolabore_normalize
  BEFORE INSERT OR UPDATE ON public.prolabore_withdrawals
  FOR EACH ROW EXECUTE FUNCTION _prolabore_normalize();

-- 5) Threshold de Fator R em fiscal_profiles (default 28%)
ALTER TABLE public.fiscal_profiles
  ADD COLUMN IF NOT EXISTS fator_r_threshold_pct numeric(5,2) DEFAULT 28.00
    CHECK (fator_r_threshold_pct >= 0 AND fator_r_threshold_pct <= 100);

COMMENT ON COLUMN public.fiscal_profiles.fator_r_threshold_pct IS
  'Limite mínimo do Fator R para manter Anexo III do Simples (padrão 28%)';

-- 6) Atualizar calculate_factor_r para incluir prolabore_withdrawals
--    e usar nomes de categoria corretos (PT-BR como em src/utils/expense.ts)
CREATE OR REPLACE FUNCTION calculate_factor_r(
    p_clinic_id uuid,
    p_start_date date,
    p_end_date date
) RETURNS jsonb AS $$
DECLARE
    v_revenue numeric;
    v_payroll_expenses numeric;
    v_payroll_prolabore numeric;
    v_payroll numeric;
    v_factor_r numeric;
    v_threshold numeric;
    v_anexo text;
    v_anexo_number integer;
BEGIN
    -- Verifica pertencimento à clínica
    IF NOT EXISTS (
        SELECT 1 FROM clinic_users
        WHERE user_id = auth.uid() AND clinic_id = p_clinic_id
    ) THEN
        RAISE EXCEPTION 'Acesso negado: você não pertence a esta clínica.';
    END IF;

    -- Threshold configurável (default 28%)
    SELECT COALESCE(fator_r_threshold_pct, 28) / 100.0
      INTO v_threshold
      FROM fiscal_profiles
      WHERE clinic_id = p_clinic_id
      LIMIT 1;
    v_threshold := COALESCE(v_threshold, 0.28);

    -- Receita bruta no período
    SELECT COALESCE(SUM(amount), 0) INTO v_revenue
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND type = 'income'
      AND date BETWEEN p_start_date AND p_end_date;

    -- Folha de pagamento via expenses (categorias PT-BR + IDs legacy)
    SELECT COALESCE(SUM(amount), 0) INTO v_payroll_expenses
    FROM financial_transactions
    WHERE clinic_id = p_clinic_id
      AND type = 'expense'
      AND (
        category IN ('Pró-labore', 'Salários', 'Encargos Trabalhistas', 'Folha de Pagamento', 'Benefícios')
        OR category IN ('pro_labore', 'salarios', 'encargos_trabalhistas', 'beneficios')
      )
      AND date BETWEEN p_start_date AND p_end_date;

    -- Pró-labore explícito (tabela dedicada — apenas status='paid' para evitar dupla contagem)
    -- Nota: se também houver lançamento como expense, ainda assim soma — recomenda-se vincular via financial_transaction_id
    SELECT COALESCE(SUM(amount), 0) INTO v_payroll_prolabore
    FROM prolabore_withdrawals
    WHERE clinic_id = p_clinic_id
      AND status = 'paid'
      AND reference_month BETWEEN date_trunc('month', p_start_date)::date AND p_end_date
      AND financial_transaction_id IS NULL; -- evita dupla contagem

    v_payroll := v_payroll_expenses + v_payroll_prolabore;

    IF v_revenue > 0 THEN
        v_factor_r := (v_payroll / v_revenue);
    ELSE
        v_factor_r := 0;
    END IF;

    IF v_factor_r >= v_threshold THEN
        v_anexo := 'Anexo III (mais vantajoso - alíquotas menores)';
        v_anexo_number := 3;
    ELSE
        v_anexo := 'Anexo V (menos vantajoso - alíquotas maiores)';
        v_anexo_number := 5;
    END IF;

    RETURN jsonb_build_object(
        'faturamento_12m', ROUND(v_revenue, 2),
        'folha_12m', ROUND(v_payroll, 2),
        'folha_expenses_12m', ROUND(v_payroll_expenses, 2),
        'folha_prolabore_12m', ROUND(v_payroll_prolabore, 2),
        'fator_r', ROUND(v_factor_r, 4),
        'fator_r_percent', ROUND(v_factor_r * 100, 2),
        'threshold_percent', ROUND(v_threshold * 100, 2),
        'anexo_recomendado', v_anexo,
        'anexo_number', v_anexo_number,
        'periodo', jsonb_build_object(
            'inicio', p_start_date,
            'fim', p_end_date
        ),
        'status', CASE
            WHEN v_factor_r >= v_threshold THEN 'bom'
            WHEN v_factor_r >= (v_threshold - 0.03) THEN 'atencao'
            ELSE 'critico'
        END,
        -- Quanto falta para atingir o threshold (em R$, considerando receita atual)
        'deficit_to_threshold', CASE
            WHEN v_factor_r < v_threshold
              THEN ROUND((v_threshold * v_revenue) - v_payroll, 2)
            ELSE 0
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION calculate_factor_r TO authenticated;

COMMENT ON FUNCTION calculate_factor_r IS
  'Calcula Fator R do Simples Nacional. Usa categorias PT-BR + IDs legacy + tabela prolabore_withdrawals. Threshold configurável em fiscal_profiles.';

-- 7) RPC: resumo de pró-labore por mês (para painel)
CREATE OR REPLACE FUNCTION public.get_prolabore_summary(
  p_clinic_id uuid,
  p_year int
)
RETURNS TABLE (
  reference_month date,
  total_amount numeric,
  partner_count int,
  paid_count int,
  planned_count int
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pw.reference_month,
    SUM(pw.amount)::numeric AS total_amount,
    COUNT(DISTINCT COALESCE(pw.partner_user_id::text, pw.partner_name))::int AS partner_count,
    COUNT(*) FILTER (WHERE pw.status = 'paid')::int AS paid_count,
    COUNT(*) FILTER (WHERE pw.status = 'planned')::int AS planned_count
  FROM public.prolabore_withdrawals pw
  WHERE pw.clinic_id = p_clinic_id
    AND EXTRACT(YEAR FROM pw.reference_month) = p_year
    AND pw.status != 'canceled'
    AND EXISTS (
      SELECT 1 FROM public.clinic_users cu
      WHERE cu.user_id = auth.uid() AND cu.clinic_id = p_clinic_id
    )
  GROUP BY pw.reference_month
  ORDER BY pw.reference_month DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_prolabore_summary(uuid, int) TO authenticated;

COMMENT ON TABLE public.prolabore_withdrawals IS
  'Retiradas de pró-labore dos sócios. Alimenta o cálculo do Fator R do Simples Nacional.';
