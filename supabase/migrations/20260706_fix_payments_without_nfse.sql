
-- Migration: versão definitiva de get_payments_without_nfse + backfill de tooth_index
--
-- Contexto: 20260529_fix_nfse_final_v3.sql (criada em 04/06, com fallback por
-- descrição) ordena alfabeticamente ANTES de 20260529_fix_nfse_missing_links.sql
-- (29/05, versão estrita). Em qualquer aplicação em ordem de nome de arquivo, a
-- versão estrita sobrescreve a corrigida — e é ela que está ativa em produção.
-- Resultado: marcações "nota fiscal emitida" (issued_externally) só casam com
-- transações que tenham tooth_index preenchido, e transações antigas ou criadas
-- pela aba de Orçamentos não têm. Esta migração, com timestamp posterior a todas,
-- fixa a lógica unificada (a mesma já usada em get_accountant_checklist v2).

-- 1) Backfill: recebíveis confirmados guardam financial_transaction_id e
-- tooth_index — copiar para as transações que ficaram sem o índice.
UPDATE public.financial_transactions ft
SET tooth_index = pr.tooth_index
FROM public.payment_receivables pr
WHERE pr.financial_transaction_id = ft.id
  AND pr.tooth_index IS NOT NULL
  AND ft.tooth_index IS NULL;

-- 2) RPC unificada (com guarda de clínica no NOT EXISTS e fallback por descrição)
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
