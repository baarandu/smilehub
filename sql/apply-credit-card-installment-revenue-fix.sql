-- Apply historical credit-card installment revenue consolidation.
--
-- Business rule:
-- Credit card installments define the card-machine fee only. Revenue is counted
-- once on the original registration date.
--
-- Run the whole file in one execution.
-- A JSON backup is stored in public.financial_transactions_credit_installments_backup.

BEGIN;

CREATE TABLE IF NOT EXISTS public.financial_transactions_credit_installments_backup (
  backup_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backed_up_at timestamptz NOT NULL DEFAULT now(),
  consolidation_group_key text NOT NULL,
  original_transaction_id uuid NOT NULL,
  original_row jsonb NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ft_credit_installments_backup_original
  ON public.financial_transactions_credit_installments_backup(original_transaction_id);

CREATE TEMP TABLE _credit_installment_groups ON COMMIT DROP AS
WITH parsed AS (
  SELECT
    ft.*,
    (regexp_match(ft.description, '\(([0-9]+)/([0-9]+)\)\s*$'))[1]::int AS installment_no,
    (regexp_match(ft.description, '\(([0-9]+)/([0-9]+)\)\s*$'))[2]::int AS installment_total,
    btrim(regexp_replace(ft.description, '\s*\([0-9]+/[0-9]+\)\s*$', '')) AS base_description
  FROM public.financial_transactions ft
  WHERE ft.type = 'income'
    AND ft.payment_method = 'credit'
    AND ft.description ~ '\([0-9]+/[0-9]+\)\s*$'
),
grouped AS (
  SELECT
    md5(concat_ws('|',
      coalesce(clinic_id::text, ''),
      coalesce(patient_id::text, ''),
      coalesce(related_entity_id::text, ''),
      coalesce(tooth_index::text, ''),
      coalesce(category, ''),
      coalesce(payment_method, ''),
      coalesce(card_machine_id::text, ''),
      coalesce(user_id::text, ''),
      coalesce(created_by::text, ''),
      base_description,
      installment_total::text
    )) AS group_key,
    (array_agg(id ORDER BY CASE WHEN installment_no = 1 THEN 0 ELSE 1 END, installment_no, date, created_at))[1] AS keep_id,
    array_agg(id ORDER BY installment_no, date, created_at) AS all_ids,
    min(date) AS original_date,
    base_description AS consolidated_description,
    sum(amount) AS gross_total,
    sum(net_amount) AS net_total,
    sum(tax_amount) AS tax_total,
    sum(card_fee_amount) AS card_fee_total,
    sum(anticipation_amount) AS anticipation_total,
    sum(location_amount) AS location_total,
    max(installment_total) AS installments,
    count(*) AS rows_found
  FROM parsed
  GROUP BY
    clinic_id,
    patient_id,
    related_entity_id,
    tooth_index,
    category,
    payment_method,
    card_machine_id,
    user_id,
    created_by,
    base_description,
    installment_total
  HAVING max(installment_total) > 1
     AND count(*) = max(installment_total)
     AND count(DISTINCT installment_no) = max(installment_total)
     AND bool_or(installment_no = 1)
)
SELECT
  group_key,
  keep_id,
  array_remove(all_ids, keep_id) AS delete_ids,
  original_date,
  consolidated_description,
  gross_total,
  net_total,
  tax_total,
  card_fee_total,
  anticipation_total,
  location_total,
  installments,
  rows_found
FROM grouped;

INSERT INTO public.financial_transactions_credit_installments_backup (
  consolidation_group_key,
  original_transaction_id,
  original_row
)
SELECT
  g.group_key,
  ft.id,
  to_jsonb(ft)
FROM _credit_installment_groups g
JOIN public.financial_transactions ft
  ON ft.id = ANY(array_append(g.delete_ids, g.keep_id))
ON CONFLICT DO NOTHING;

UPDATE public.financial_transactions ft
SET
  amount = g.gross_total,
  net_amount = g.net_total,
  tax_amount = g.tax_total,
  card_fee_amount = g.card_fee_total,
  anticipation_amount = g.anticipation_total,
  location_amount = g.location_total,
  date = g.original_date,
  description = g.consolidated_description,
  updated_at = now()
FROM _credit_installment_groups g
WHERE ft.id = g.keep_id;

UPDATE public.nfse_documents n
SET financial_transaction_id = g.keep_id
FROM _credit_installment_groups g
WHERE n.financial_transaction_id = ANY(g.delete_ids);

UPDATE public.payment_receivables r
SET
  financial_transaction_id = g.keep_id,
  updated_at = now()
FROM _credit_installment_groups g
WHERE r.financial_transaction_id = ANY(g.delete_ids);

UPDATE public.patient_credits pc
SET related_transaction_id = g.keep_id
FROM _credit_installment_groups g
WHERE pc.related_transaction_id = ANY(g.delete_ids);

DELETE FROM public.financial_transactions ft
USING _credit_installment_groups g
WHERE ft.id = ANY(g.delete_ids);

SELECT
  count(*) AS groups_consolidated,
  coalesce(sum(rows_found), 0) AS old_rows_in_groups,
  coalesce(sum(cardinality(delete_ids)), 0) AS rows_deleted,
  coalesce(sum(gross_total), 0) AS consolidated_gross_total
FROM _credit_installment_groups;

COMMIT;
