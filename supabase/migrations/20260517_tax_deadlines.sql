-- ============================================================
-- Tax Deadlines — Calendário de Prazos Fiscais
-- Modelo: regras recorrentes (rules) + completions por ocorrência.
-- Ex: FGTS dia 07, DAS dia 20, envio contador dia 03, etc.
-- ============================================================

-- 1) Regras de recorrência
CREATE TABLE IF NOT EXISTS public.tax_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,

  -- Identificação e exibição
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('payment', 'submission', 'closure', 'declaration')),
  responsible text NOT NULL CHECK (responsible IN ('client', 'accountant', 'shared')),

  -- Recorrência
  frequency text NOT NULL CHECK (frequency IN ('monthly', 'annually')),
  day_of_month int NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  month_of_year int CHECK (month_of_year BETWEEN 1 AND 12), -- só para annual

  -- "Mês de referência": prazo é no mês seguinte? (true para a maioria das obrigações do Simples)
  -- ex: pró-labore de Janeiro → INSS pago em 20/Fevereiro
  due_in_next_month boolean NOT NULL DEFAULT true,

  -- Quais regimes/empresas se aplicam (NULL = todos)
  applies_to_regime text[],

  -- Apenas se houver funcionários CLT (FGTS)
  requires_employees boolean NOT NULL DEFAULT false,

  -- Sistema (seed default) vs. customizado pelo usuário
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,

  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_deadlines_clinic
  ON public.tax_deadlines (clinic_id, is_active);

-- 2) Tabela de completions (uma linha quando o usuário marca "feito" para uma ocorrência específica)
CREATE TABLE IF NOT EXISTS public.tax_deadline_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  deadline_id uuid NOT NULL REFERENCES public.tax_deadlines(id) ON DELETE CASCADE,

  -- Data efetiva da ocorrência (ex: 2026-03-20 para o DAS de Fevereiro)
  occurrence_date date NOT NULL,

  status text NOT NULL DEFAULT 'done' CHECK (status IN ('done', 'skipped')),
  completed_at timestamptz NOT NULL DEFAULT now(),
  completed_by uuid REFERENCES auth.users(id),
  notes text,
  -- valor pago (opcional, para guias de imposto)
  amount_paid numeric(12,2)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deadline_completion_unique
  ON public.tax_deadline_completions (deadline_id, occurrence_date);

CREATE INDEX IF NOT EXISTS idx_deadline_completion_clinic_date
  ON public.tax_deadline_completions (clinic_id, occurrence_date DESC);

-- 3) RLS
ALTER TABLE public.tax_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_deadline_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_deadlines_all_own_clinic"
  ON public.tax_deadlines FOR ALL TO authenticated
  USING (clinic_id IN (SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()))
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()));

CREATE POLICY "tax_deadline_completions_all_own_clinic"
  ON public.tax_deadline_completions FOR ALL TO authenticated
  USING (clinic_id IN (SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()))
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()));

-- 4) Trigger updated_at
DROP TRIGGER IF EXISTS handle_tax_deadlines_updated_at ON public.tax_deadlines;
CREATE TRIGGER handle_tax_deadlines_updated_at
  BEFORE UPDATE ON public.tax_deadlines
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5) Função para gerar ocorrências em um intervalo
-- Dada uma regra + range de datas, retorna as datas de ocorrência
CREATE OR REPLACE FUNCTION public.generate_deadline_occurrences(
  p_clinic_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  deadline_id uuid,
  occurrence_date date,
  deadline_name text,
  deadline_description text,
  category text,
  responsible text,
  day_of_month int,
  is_completed boolean,
  completion_id uuid,
  completion_status text,
  completion_notes text,
  amount_paid numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  d date;
  candidate_date date;
  effective_day int;
  last_day_in_month int;
BEGIN
  -- Verifica pertencimento
  IF NOT EXISTS (
    SELECT 1 FROM clinic_users WHERE user_id = auth.uid() AND clinic_id = p_clinic_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado: você não pertence a esta clínica.';
  END IF;

  FOR r IN
    SELECT * FROM tax_deadlines
    WHERE clinic_id = p_clinic_id AND is_active = true
  LOOP
    -- Mensal
    IF r.frequency = 'monthly' THEN
      d := date_trunc('month', p_start_date)::date;
      WHILE d <= p_end_date LOOP
        -- Ajusta para o último dia válido se o mês não tem dia_of_month
        last_day_in_month := EXTRACT(DAY FROM (date_trunc('month', d) + interval '1 month - 1 day'))::int;
        effective_day := LEAST(r.day_of_month, last_day_in_month);
        candidate_date := (date_trunc('month', d) + (effective_day - 1) * interval '1 day')::date;

        IF candidate_date BETWEEN p_start_date AND p_end_date THEN
          RETURN QUERY
          SELECT
            r.id,
            candidate_date,
            r.name,
            r.description,
            r.category,
            r.responsible,
            r.day_of_month,
            (c.id IS NOT NULL) AS is_completed,
            c.id,
            c.status,
            c.notes,
            c.amount_paid
          FROM (SELECT 1) _
          LEFT JOIN tax_deadline_completions c
            ON c.deadline_id = r.id AND c.occurrence_date = candidate_date;
        END IF;

        d := (d + interval '1 month')::date;
      END LOOP;

    -- Anual
    ELSIF r.frequency = 'annually' AND r.month_of_year IS NOT NULL THEN
      -- Verifica todos os anos no range
      FOR d IN
        SELECT generate_series(
          (date_trunc('year', p_start_date))::date,
          (date_trunc('year', p_end_date) + interval '1 year - 1 day')::date,
          '1 year'::interval
        )::date
      LOOP
        last_day_in_month := EXTRACT(
          DAY FROM (make_date(EXTRACT(YEAR FROM d)::int, r.month_of_year, 1) + interval '1 month - 1 day')
        )::int;
        effective_day := LEAST(r.day_of_month, last_day_in_month);
        candidate_date := make_date(EXTRACT(YEAR FROM d)::int, r.month_of_year, effective_day);

        IF candidate_date BETWEEN p_start_date AND p_end_date THEN
          RETURN QUERY
          SELECT
            r.id,
            candidate_date,
            r.name,
            r.description,
            r.category,
            r.responsible,
            r.day_of_month,
            (c.id IS NOT NULL) AS is_completed,
            c.id,
            c.status,
            c.notes,
            c.amount_paid
          FROM (SELECT 1) _
          LEFT JOIN tax_deadline_completions c
            ON c.deadline_id = r.id AND c.occurrence_date = candidate_date;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_deadline_occurrences(uuid, date, date) TO authenticated;

-- 6) Função para semear deadlines default em uma clínica (Simples Nacional)
CREATE OR REPLACE FUNCTION public.seed_default_tax_deadlines(
  p_clinic_id uuid
)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM clinic_users WHERE user_id = auth.uid() AND clinic_id = p_clinic_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado: você não pertence a esta clínica.';
  END IF;

  -- Skip se já existem rules do sistema
  IF EXISTS (
    SELECT 1 FROM tax_deadlines
    WHERE clinic_id = p_clinic_id AND is_system = true
  ) THEN
    RETURN 0;
  END IF;

  INSERT INTO tax_deadlines (clinic_id, name, description, category, responsible, frequency, day_of_month, due_in_next_month, applies_to_regime, requires_employees, is_system)
  VALUES
    (p_clinic_id, 'Envio da documentação ao contador',
      'Envio dos documentos do mês anterior (NFS-e, extratos, despesas) para a contabilidade.',
      'submission', 'client', 'monthly', 3, true,
      ARRAY['simples', 'lucro_presumido', 'lucro_real'], false, true),

    (p_clinic_id, 'Pagamento do FGTS',
      'Vencimento do FGTS dos funcionários (apenas se houver CLT).',
      'payment', 'client', 'monthly', 7, true,
      ARRAY['simples', 'lucro_presumido', 'lucro_real'], true, true),

    (p_clinic_id, 'Envio da guia do INSS pelo contador',
      'O contador calcula e envia a guia do INSS sobre o pró-labore.',
      'submission', 'accountant', 'monthly', 15, true,
      ARRAY['simples', 'lucro_presumido', 'lucro_real'], false, true),

    (p_clinic_id, 'Envio da guia do DAS pelo contador',
      'O contador apura e envia a guia do Simples Nacional (DAS).',
      'submission', 'accountant', 'monthly', 18, true,
      ARRAY['simples'], false, true),

    (p_clinic_id, 'Pagamento do DAS (Simples Nacional)',
      'Vencimento do DAS do Simples Nacional.',
      'payment', 'client', 'monthly', 20, true,
      ARRAY['simples'], false, true),

    (p_clinic_id, 'Pagamento do INSS (Pró-labore)',
      'Vencimento da contribuição previdenciária dos sócios.',
      'payment', 'client', 'monthly', 20, true,
      ARRAY['simples', 'lucro_presumido', 'lucro_real'], false, true),

    (p_clinic_id, 'Fechamento do Balanço Mensal',
      'Conferência e fechamento contábil do mês.',
      'closure', 'accountant', 'monthly', 30, true,
      ARRAY['simples', 'lucro_presumido', 'lucro_real'], false, true),

    -- Anuais
    (p_clinic_id, 'Entrega da DEFIS',
      'Declaração de Informações Socioeconômicas e Fiscais (anual, do Simples Nacional).',
      'declaration', 'accountant', 'annually', 31, false,
      ARRAY['simples'], false, true),

    (p_clinic_id, 'Entrega do IRPF',
      'Prazo final para entrega da declaração de Imposto de Renda Pessoa Física.',
      'declaration', 'client', 'annually', 30, false,
      ARRAY['pf', 'simples', 'lucro_presumido', 'lucro_real'], false, true);

  -- Atribuir month_of_year às anuais
  UPDATE tax_deadlines SET month_of_year = 3
    WHERE clinic_id = p_clinic_id AND name = 'Entrega da DEFIS' AND is_system = true;
  UPDATE tax_deadlines SET month_of_year = 4
    WHERE clinic_id = p_clinic_id AND name = 'Entrega do IRPF' AND is_system = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_tax_deadlines(uuid) TO authenticated;

COMMENT ON TABLE public.tax_deadlines IS
  'Regras recorrentes de prazos fiscais (FGTS, DAS, INSS, envios, fechamento). Ocorrências são geradas em tempo de leitura via generate_deadline_occurrences.';
