-- Preview historical credit-card installment revenues that can be consolidated.
--
-- This query does not change data.

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
groups AS (
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
    min(date) AS original_date,
    max(installment_total) AS installments,
    count(*) AS rows_found,
    array_agg(id ORDER BY installment_no, date, created_at) AS transaction_ids,
    base_description AS consolidated_description,
    sum(amount) AS gross_total,
    sum(net_amount) AS net_total,
    sum(tax_amount) AS tax_total,
    sum(card_fee_amount) AS card_fee_total,
    sum(anticipation_amount) AS anticipation_total,
    sum(location_amount) AS location_total
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
SELECT *
FROM groups
ORDER BY original_date DESC, consolidated_description;
