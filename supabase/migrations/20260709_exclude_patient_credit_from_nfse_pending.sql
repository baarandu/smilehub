
-- Migration: crédito do paciente não é pendência de nota fiscal
--
-- Contexto: o AddCreditDialog lança a entrada do crédito como receita no
-- Financeiro (regime de caixa), com category = 'Crédito do Paciente' e sem
-- vínculo com orçamento/dente. A nota fiscal nunca é emitida sobre o crédito
-- em si — ela é emitida sobre o procedimento que consumiu o crédito (e o
-- procedimento tem sua própria marcação por budget_id + tooth_index).
-- Como a transação do crédito não casa com nenhuma nfse_document, ela ficava
-- eternamente listada em "pagamentos sem nota" na aba Notas Fiscais e no
-- checklist do contador, mesmo com todos os checkboxes do paciente marcados.
--
-- Correção: excluir transações com category = 'Crédito do Paciente' das duas
-- consultas de pendência. Os totais de receita do checklist continuam
-- incluindo o crédito (o dinheiro entrou no caixa de fato).

-- 1) RPC da aba Notas Fiscais (mesma base de 20260706_fix_payments_without_nfse)
CREATE OR REPLACE FUNCTION public.get_payments_without_nfse(
  p_clinic_id uuid,
  p_year int,
  p_month int
)
RETURNS TABLE (
  transaction_id uuid,
  transaction_date date,
  amount numeric,
  patient_id uuid,
  patient_name text,
  dentist_id uuid,
  description text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ft.id AS transaction_id,
    ft.date AS transaction_date,
    ft.amount,
    ft.patient_id,
    p.name AS patient_name,
    ft.dentist_id,
    ft.description
  FROM public.financial_transactions ft
  LEFT JOIN public.patients p ON p.id = ft.patient_id
  WHERE ft.clinic_id = p_clinic_id
    AND ft.type = 'income'
    AND ft.category IS DISTINCT FROM 'Crédito do Paciente'
    AND ft.date >= make_date(p_year, p_month, 1)
    AND ft.date < (make_date(p_year, p_month, 1) + interval '1 month')::date
    AND NOT EXISTS (
      SELECT 1 FROM public.nfse_documents n
      WHERE n.clinic_id = p_clinic_id
        AND n.status != 'canceled'
        AND (
          -- Vínculo direto com a transação
          n.financial_transaction_id = ft.id
          OR (
            -- Vínculo por orçamento + item
            n.budget_id = ft.related_entity_id
            AND (
              (n.tooth_index IS NOT NULL AND ft.tooth_index IS NOT NULL AND n.tooth_index = ft.tooth_index)
              OR
              -- Fallback para transações legadas sem tooth_index: casa a marcação
              -- externa pelo nome do dente presente na descrição da transação
              (
                n.issued_externally = true
                AND n.service_description IS NOT NULL
                AND ft.description LIKE '%' || split_part(n.service_description, ' - ', 2) || '%'
              )
            )
          )
        )
    )
    AND (
      ft.patient_id IS NULL OR
      EXISTS (
        SELECT 1 FROM public.clinic_users cu
        WHERE cu.clinic_id = p_clinic_id
          AND cu.user_id = auth.uid()
      )
    )
  ORDER BY ft.date DESC;
$$;

-- 2) Checklist do contador: mesma exclusão na contagem de pendências
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
  -- 1) Access check
  IF NOT EXISTS (
    SELECT 1 FROM public.clinic_users WHERE user_id = auth.uid() AND clinic_id = p_clinic_id
  ) THEN
    RAISE EXCEPTION 'Acesso negado: você não pertence a esta clínica.';
  END IF;

  v_ref_month := make_date(p_year, p_month, 1);
  v_start := v_ref_month;
  v_end := (v_ref_month + interval '1 month' - interval '1 day')::date;

  -- 2) NFS-e count (all non-canceled in the month)
  SELECT COUNT(*) INTO v_nfse_count
  FROM public.nfse_documents
  WHERE clinic_id = p_clinic_id
    AND issue_date BETWEEN v_start AND v_end
    AND status != 'canceled';

  -- 3) Payments WITHOUT NFS-e (sincronizado com get_payments_without_nfse)
  SELECT COUNT(*) INTO v_payments_without_nfse_count
  FROM public.financial_transactions ft
  WHERE ft.clinic_id = p_clinic_id
    AND ft.type = 'income'
    AND ft.category IS DISTINCT FROM 'Crédito do Paciente'
    AND ft.date >= v_start AND ft.date <= v_end
    AND NOT EXISTS (
      SELECT 1 FROM public.nfse_documents n
      WHERE n.clinic_id = p_clinic_id
        AND n.status != 'canceled'
        AND (
          n.financial_transaction_id = ft.id
          OR (
            n.budget_id = ft.related_entity_id
            AND (
              (n.tooth_index IS NOT NULL AND ft.tooth_index IS NOT NULL AND n.tooth_index = ft.tooth_index)
              OR
              (
                n.issued_externally = true
                AND n.service_description IS NOT NULL
                AND ft.description LIKE '%' || split_part(n.service_description, ' - ', 2) || '%'
              )
            )
          )
        )
    );

  -- 4) Expenses
  SELECT COUNT(*), COALESCE(SUM(amount), 0)
    INTO v_expenses_count, v_expenses_total
  FROM public.financial_transactions
  WHERE clinic_id = p_clinic_id
    AND type = 'expense'
    AND date >= v_start AND date <= v_end;

  -- 5) Revenue
  SELECT COUNT(*), COALESCE(SUM(amount), 0), COUNT(DISTINCT dentist_id) FILTER (WHERE dentist_id IS NOT NULL)
    INTO v_income_count, v_income_total, v_dentists_with_revenue
  FROM public.financial_transactions
  WHERE clinic_id = p_clinic_id
    AND type = 'income'
    AND date >= v_start AND date <= v_end;

  -- 6) Pro-labore
  SELECT
    COUNT(*) FILTER (WHERE status = 'paid'),
    COUNT(*) FILTER (WHERE status = 'planned')
    INTO v_prolabore_paid, v_prolabore_planned
  FROM public.prolabore_withdrawals
  WHERE clinic_id = p_clinic_id
    AND reference_month = v_ref_month;

  -- 7) Card machine
  SELECT COUNT(*) INTO v_card_machine_tx
  FROM public.financial_transactions
  WHERE clinic_id = p_clinic_id
    AND type = 'income'
    AND card_machine_id IS NOT NULL
    AND date >= v_start AND date <= v_end;

  -- 8) Manual uploads
  SELECT
    COUNT(*) FILTER (WHERE file_type = 'bank_statement_pdf'),
    COUNT(*) FILTER (WHERE file_type = 'bank_statement_ofx'),
    COUNT(*) FILTER (WHERE file_type = 'card_machine_report')
    INTO v_bank_pdf_count, v_bank_ofx_count, v_card_report_count
  FROM public.accountant_submission_files
  WHERE clinic_id = p_clinic_id
    AND reference_month = v_ref_month;

  -- 9) Submission summary
  SELECT to_jsonb(s) INTO v_submission
  FROM public.accountant_submissions s
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
