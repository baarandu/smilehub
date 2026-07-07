
-- Nº de parcelas do cartão usado na transação (é o que define a taxa aplicada).
ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS installments int;

-- Backfill 1: recebíveis confirmados guardam as parcelas e o id da transação.
UPDATE public.financial_transactions ft
SET installments = pr.installments
FROM public.payment_receivables pr
WHERE pr.financial_transaction_id = ft.id
  AND ft.installments IS NULL
  AND pr.installments IS NOT NULL;

-- Backfill 2: parcelamentos antigos carregam o marcador "(i/N)" na descrição.
UPDATE public.financial_transactions
SET installments = (regexp_match(description, '\((\d+)/(\d+)\)'))[2]::int
WHERE installments IS NULL
  AND description ~ '\(\d+/\d+\)';

-- Backfill 3: cartão sem marcador nem recebível era à vista.
UPDATE public.financial_transactions
SET installments = 1
WHERE installments IS NULL
  AND payment_method IN ('credit', 'debit');
