-- Blindagem contra "receita órfã" em parcelas (payment_receivables).
--
-- A coluna payment_receivables.financial_transaction_id foi criada sem FOREIGN
-- KEY (ver 20260306_split_payments_receivables.sql). Por isso, quando uma receita
-- (financial_transactions) vinculada a uma parcela era excluída por um caminho
-- que não revertia a parcela, o financial_transaction_id ficava "pendurado":
-- a parcela seguia 'confirmed' apontando para um id inexistente e o dinheiro
-- recebido sumia do Financeiro sem nenhum sinal.
--
-- Esta migration:
--   1. Limpa quaisquer vínculos pendurados (id que não existe mais) -> NULL.
--   2. Adiciona a FK com ON DELETE SET NULL, igual já é feito em
--      nfse_documents e prolabore_payments. Assim, se uma receita for excluída
--      por qualquer caminho, a parcela perde o vínculo automaticamente (fica
--      reconciliável pela varredura de órfãos) em vez de virar órfã silenciosa.

-- 1. Zera referências penduradas antes de impor a constraint (senão o ADD falha).
UPDATE public.payment_receivables pr
SET financial_transaction_id = NULL
WHERE pr.financial_transaction_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.financial_transactions ft
    WHERE ft.id = pr.financial_transaction_id
  );

-- 2. Cria a FK (idempotente).
ALTER TABLE public.payment_receivables
  DROP CONSTRAINT IF EXISTS payment_receivables_financial_transaction_id_fkey;

ALTER TABLE public.payment_receivables
  ADD CONSTRAINT payment_receivables_financial_transaction_id_fkey
  FOREIGN KEY (financial_transaction_id)
  REFERENCES public.financial_transactions(id)
  ON DELETE SET NULL;
