-- ============================================================
-- Accountant Monthly Submissions — Checklist mensal pro contador
-- Rastreia o que precisa ser enviado mensalmente (dia 03 de cada mês)
-- e centraliza uploads manuais (extratos bancários, relatórios da maquininha).
-- ============================================================

-- 1) Submissão mensal (1 por clínica por mês)
CREATE TABLE IF NOT EXISTS public.accountant_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  reference_month date NOT NULL, -- 1º dia do mês de competência

  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent')),

  sent_at timestamptz,
  sent_by uuid REFERENCES auth.users(id),
  recipient_email text, -- e-mail do contador (opcional)
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_unique_per_month
  ON public.accountant_submissions (clinic_id, reference_month);

-- 2) Arquivos anexados manualmente à submissão (extratos, relatórios da maquininha, etc.)
CREATE TABLE IF NOT EXISTS public.accountant_submission_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  reference_month date NOT NULL,

  file_type text NOT NULL CHECK (file_type IN (
    'bank_statement_pdf',
    'bank_statement_ofx',
    'card_machine_report',
    'expense_receipt',
    'other'
  )),
  file_name text NOT NULL,
  file_url text NOT NULL, -- storage path
  file_size int,
  mime_type text,
  notes text,

  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submission_files_month
  ON public.accountant_submission_files (clinic_id, reference_month, file_type);

-- 3) RLS
ALTER TABLE public.accountant_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountant_submission_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "submissions_all_own_clinic"
  ON public.accountant_submissions FOR ALL
  TO authenticated
  USING (
    clinic_id IN (SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid())
  );

CREATE POLICY "submission_files_all_own_clinic"
  ON public.accountant_submission_files FOR ALL
  TO authenticated
  USING (
    clinic_id IN (SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid())
  );

-- 4) Trigger updated_at
DROP TRIGGER IF EXISTS handle_submissions_updated_at ON public.accountant_submissions;
CREATE TRIGGER handle_submissions_updated_at
  BEFORE UPDATE ON public.accountant_submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5) Trigger: garantir que reference_month seja sempre 1º dia
CREATE OR REPLACE FUNCTION _accountant_normalize_month()
RETURNS trigger AS $$
BEGIN
  NEW.reference_month := date_trunc('month', NEW.reference_month)::date;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_submission_normalize ON public.accountant_submissions;
CREATE TRIGGER trg_submission_normalize
  BEFORE INSERT OR UPDATE ON public.accountant_submissions
  FOR EACH ROW EXECUTE FUNCTION _accountant_normalize_month();

DROP TRIGGER IF EXISTS trg_submission_file_normalize ON public.accountant_submission_files;
CREATE TRIGGER trg_submission_file_normalize
  BEFORE INSERT OR UPDATE ON public.accountant_submission_files
  FOR EACH ROW EXECUTE FUNCTION _accountant_normalize_month();

-- 6) Bucket de storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'accountant-submissions',
  'accountant-submissions',
  false,
  20971520, -- 20MB
  ARRAY['application/pdf', 'application/xml', 'text/xml', 'application/octet-stream', 'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "submission_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'accountant-submissions');

CREATE POLICY "submission_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'accountant-submissions');

CREATE POLICY "submission_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'accountant-submissions');

-- 7) RPC: derivar status do checklist a partir dos dados existentes
CREATE OR REPLACE FUNCTION public.get_accountant_checklist(
  p_clinic_id uuid,
  p_year int,
  p_month int
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref_month date;
  v_start date;
  v_end date;
  v_nfse_count int;
  v_payments_without_nfse_count int;
  v_expenses_count int;
  v_expenses_total numeric;
  v_income_count int;
  v_income_total numeric;
  v_dentists_with_revenue int;
  v_prolabore_paid int;
  v_prolabore_planned int;
  v_card_machine_tx int;
  v_bank_pdf_count int;
  v_bank_ofx_count int;
  v_card_report_count int;
  v_submission jsonb;
BEGIN
  -- Verifica pertencimento
  IF NOT EXISTS (
    SELECT 1 FROM clinic_users WHERE user_id = auth.uid() AND clinic_id = p_clinic_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado: você não pertence a esta clínica.';
  END IF;

  v_ref_month := make_date(p_year, p_month, 1);
  v_start := v_ref_month;
  v_end := (v_ref_month + interval '1 month' - interval '1 day')::date;

  -- NFS-e do mês
  SELECT COUNT(*) INTO v_nfse_count
  FROM nfse_documents
  WHERE clinic_id = p_clinic_id
    AND issue_date BETWEEN v_start AND v_end
    AND status != 'canceled';

  -- Pagamentos do mês sem NFS-e
  SELECT COUNT(*) INTO v_payments_without_nfse_count
  FROM financial_transactions ft
  WHERE ft.clinic_id = p_clinic_id
    AND ft.type = 'income'
    AND ft.date BETWEEN v_start AND v_end
    AND NOT EXISTS (
      SELECT 1 FROM nfse_documents n
      WHERE n.financial_transaction_id = ft.id AND n.status != 'canceled'
    );

  -- Despesas do mês
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
    INTO v_expenses_count, v_expenses_total
  FROM financial_transactions
  WHERE clinic_id = p_clinic_id
    AND type = 'expense'
    AND date BETWEEN v_start AND v_end;

  -- Receitas + número de dentistas com produção
  SELECT COUNT(*), COALESCE(SUM(amount), 0), COUNT(DISTINCT dentist_id) FILTER (WHERE dentist_id IS NOT NULL)
    INTO v_income_count, v_income_total, v_dentists_with_revenue
  FROM financial_transactions
  WHERE clinic_id = p_clinic_id
    AND type = 'income'
    AND date BETWEEN v_start AND v_end;

  -- Pró-labore
  SELECT
    COUNT(*) FILTER (WHERE status = 'paid'),
    COUNT(*) FILTER (WHERE status = 'planned')
    INTO v_prolabore_paid, v_prolabore_planned
  FROM prolabore_withdrawals
  WHERE clinic_id = p_clinic_id
    AND reference_month = v_ref_month;

  -- Transações via maquininha
  SELECT COUNT(*) INTO v_card_machine_tx
  FROM financial_transactions
  WHERE clinic_id = p_clinic_id
    AND type = 'income'
    AND card_machine_id IS NOT NULL
    AND date BETWEEN v_start AND v_end;

  -- Uploads manuais
  SELECT
    COUNT(*) FILTER (WHERE file_type = 'bank_statement_pdf'),
    COUNT(*) FILTER (WHERE file_type = 'bank_statement_ofx'),
    COUNT(*) FILTER (WHERE file_type = 'card_machine_report')
    INTO v_bank_pdf_count, v_bank_ofx_count, v_card_report_count
  FROM accountant_submission_files
  WHERE clinic_id = p_clinic_id
    AND reference_month = v_ref_month;

  -- Status da submissão
  SELECT to_jsonb(s) INTO v_submission
  FROM accountant_submissions s
  WHERE s.clinic_id = p_clinic_id AND s.reference_month = v_ref_month;

  RETURN jsonb_build_object(
    'reference_month', v_ref_month,
    'submission', COALESCE(v_submission, jsonb_build_object('status', 'draft')),
    'items', jsonb_build_object(
      'nfse', jsonb_build_object(
        'count', v_nfse_count,
        'payments_without_nfse', v_payments_without_nfse_count,
        'status', CASE
          WHEN v_payments_without_nfse_count = 0 AND v_nfse_count > 0 THEN 'complete'
          WHEN v_payments_without_nfse_count > 0 THEN 'incomplete'
          ELSE 'empty'
        END
      ),
      'expenses', jsonb_build_object(
        'count', v_expenses_count,
        'total', v_expenses_total,
        'status', CASE WHEN v_expenses_count > 0 THEN 'complete' ELSE 'empty' END
      ),
      'income', jsonb_build_object(
        'count', v_income_count,
        'total', v_income_total,
        'dentists_with_revenue', v_dentists_with_revenue,
        'status', CASE WHEN v_income_count > 0 THEN 'complete' ELSE 'empty' END
      ),
      'prolabore', jsonb_build_object(
        'paid', v_prolabore_paid,
        'planned', v_prolabore_planned,
        'status', CASE
          WHEN v_prolabore_paid > 0 THEN 'complete'
          WHEN v_prolabore_planned > 0 THEN 'incomplete'
          ELSE 'empty'
        END
      ),
      'card_machine', jsonb_build_object(
        'transactions', v_card_machine_tx,
        'report_uploaded', v_card_report_count,
        'status', CASE
          WHEN v_card_machine_tx = 0 THEN 'not_applicable'
          WHEN v_card_report_count > 0 THEN 'complete'
          ELSE 'incomplete'
        END
      ),
      'bank_statement', jsonb_build_object(
        'pdf_count', v_bank_pdf_count,
        'ofx_count', v_bank_ofx_count,
        'status', CASE
          WHEN v_bank_pdf_count > 0 AND v_bank_ofx_count > 0 THEN 'complete'
          WHEN v_bank_pdf_count > 0 OR v_bank_ofx_count > 0 THEN 'incomplete'
          ELSE 'empty'
        END
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_accountant_checklist(uuid, int, int) TO authenticated;

COMMENT ON TABLE public.accountant_submissions IS
  'Submissão mensal de documentos ao contador. Uma por clínica por mês.';
COMMENT ON FUNCTION public.get_accountant_checklist IS
  'Deriva o status do checklist mensal do contador a partir das tabelas existentes (NFS-e, financeiro, pró-labore) + uploads manuais.';
