
-- Migration: Add tooth_index to financial_transactions and update NF-e missing report RPC

-- 1) Add column to financial_transactions
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS tooth_index int;

-- 2) Update the RPC function to recognize links via (budget_id + tooth_index)
-- This allows "externally issued" NF-e marks (which are budget+tooth scoped) 
-- to correctly exclude their corresponding financial transactions.
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
    AND EXTRACT(YEAR FROM ft.date) = p_year
    AND EXTRACT(MONTH FROM ft.date) = p_month
    -- Exclude if a non-canceled NFS-e document exists that links to:
    -- a) This specific transaction ID
    -- b) This specific budget + tooth item
    AND NOT EXISTS (
      SELECT 1 FROM public.nfse_documents n
      WHERE n.status != 'canceled'
        AND (
          n.financial_transaction_id = ft.id
          OR (
            n.budget_id = ft.related_entity_id 
            AND n.tooth_index IS NOT NULL 
            AND n.tooth_index = ft.tooth_index
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

-- 3) Backfill tooth_index for existing transactions where possible (by parsing description)
-- Format: "... - Dente XX" or "... - Arcada Superior/Inferior/Ambas"
-- This is a bit complex in pure SQL because we need to match the tooth string 
-- back to the index in the budget's JSON notes. 
-- Since historical accuracy for this card is less critical than future functionality, 
-- we'll skip backfilling unless the user asks, OR do a best-effort simpler link.

-- Best-effort simpler link: if a transaction is linked to a budget and that budget 
-- only has ONE tooth/item, we can safely fill the tooth_index.
-- (Omitted here for safety, can be done manually if needed).
