
-- Migration: Update Accountant Checklist RPC to sync with new NF-e link logic

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

  -- Pagamentos do mês sem NFS-e (SINCRO COM NOVA LOGICA DE LINK)
  SELECT COUNT(*) INTO v_payments_without_nfse_count
  FROM financial_transactions ft
  WHERE ft.clinic_id = p_clinic_id
    AND ft.type = 'income'
    AND ft.date BETWEEN v_start AND v_end
    AND NOT EXISTS (
      SELECT 1 FROM nfse_documents n
      WHERE n.status != 'canceled'
        AND (
          n.financial_transaction_id = ft.id
          OR (
            n.budget_id = ft.related_entity_id 
            AND n.tooth_index IS NOT NULL 
            AND n.tooth_index = ft.tooth_index
          )
        )
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
