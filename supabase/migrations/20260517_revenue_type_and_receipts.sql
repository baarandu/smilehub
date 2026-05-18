-- ============================================================
-- Feature B: Revenue Type (Individual vs Clinic)
-- Feature D: Expense Receipt Attachments
-- ============================================================

-- 1) Adicionar revenue_type em financial_transactions
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS revenue_type text DEFAULT 'individual'
    CHECK (revenue_type IN ('individual', 'clinic'));

COMMENT ON COLUMN public.financial_transactions.revenue_type IS
  'Para receitas: individual = produção técnica do dentista (vai pro relatório por sócio); clinic = receita compartilhada da estrutura (não atribuída a um sócio)';

-- Índice pra filtros do relatório
CREATE INDEX IF NOT EXISTS idx_financial_transactions_revenue_type
  ON public.financial_transactions (clinic_id, type, revenue_type, date)
  WHERE type = 'income';

-- 2) Bucket de storage pra recibos de despesas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'expense-receipts',
  'expense-receipts',
  false,
  10485760, -- 10MB
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp',
    'application/xml', 'text/xml'
  ]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "expense_receipts_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'expense-receipts');

CREATE POLICY "expense_receipts_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'expense-receipts');

CREATE POLICY "expense_receipts_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'expense-receipts');

-- 3) RPC: relatório de produção por sócio em um mês
CREATE OR REPLACE FUNCTION public.get_production_by_dentist(
  p_clinic_id uuid,
  p_year int,
  p_month int
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date;
  v_end date;
  v_dentists jsonb;
  v_clinic_revenue numeric;
  v_individual_revenue numeric;
  v_total_revenue numeric;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM clinic_users WHERE user_id = auth.uid() AND clinic_id = p_clinic_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado: você não pertence a esta clínica.';
  END IF;

  v_start := make_date(p_year, p_month, 1);
  v_end := (v_start + interval '1 month - 1 day')::date;

  -- Receita individual por dentista (agregação)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'dentist_id', dentist_id,
      'dentist_name', dentist_name,
      'revenue', revenue,
      'transaction_count', transaction_count,
      'avg_ticket', CASE WHEN transaction_count > 0 THEN ROUND(revenue / transaction_count, 2) ELSE 0 END
    ) ORDER BY revenue DESC
  ), '[]'::jsonb) INTO v_dentists
  FROM (
    SELECT
      ft.dentist_id,
      COALESCE(
        (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = ft.dentist_id),
        (SELECT email FROM auth.users WHERE id = ft.dentist_id),
        'Sem identificação'
      ) AS dentist_name,
      SUM(ft.amount)::numeric AS revenue,
      COUNT(*)::int AS transaction_count
    FROM financial_transactions ft
    WHERE ft.clinic_id = p_clinic_id
      AND ft.type = 'income'
      AND ft.revenue_type = 'individual'
      AND ft.date BETWEEN v_start AND v_end
      AND ft.dentist_id IS NOT NULL
    GROUP BY ft.dentist_id
  ) agg;

  -- Receita compartilhada da clínica
  SELECT COALESCE(SUM(amount), 0) INTO v_clinic_revenue
  FROM financial_transactions
  WHERE clinic_id = p_clinic_id
    AND type = 'income'
    AND revenue_type = 'clinic'
    AND date BETWEEN v_start AND v_end;

  -- Receita individual total (inclui as sem dentist_id)
  SELECT COALESCE(SUM(amount), 0) INTO v_individual_revenue
  FROM financial_transactions
  WHERE clinic_id = p_clinic_id
    AND type = 'income'
    AND revenue_type = 'individual'
    AND date BETWEEN v_start AND v_end;

  v_total_revenue := v_individual_revenue + v_clinic_revenue;

  RETURN jsonb_build_object(
    'reference_month', v_start,
    'individual_revenue', ROUND(v_individual_revenue, 2),
    'clinic_revenue', ROUND(v_clinic_revenue, 2),
    'total_revenue', ROUND(v_total_revenue, 2),
    'dentists', v_dentists,
    'unassigned_individual_revenue', ROUND(
      v_individual_revenue - (
        SELECT COALESCE(SUM((d->>'revenue')::numeric), 0)
        FROM jsonb_array_elements(v_dentists) d
      ), 2
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_production_by_dentist(uuid, int, int) TO authenticated;

COMMENT ON FUNCTION public.get_production_by_dentist IS
  'Relatório mensal de produção por sócio (receitas individuais) + total de receita compartilhada da clínica.';
