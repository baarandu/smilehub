-- Soft-delete de orçamentos.
--
-- Antes, excluir um orçamento apagava a linha de budgets (e budget_items), o
-- que dispara o ON DELETE CASCADE de payment_receivables e destrói as parcelas
-- e recebimentos de forma DEFINITIVA. No plano gratuito do Supabase não há
-- backup/PITR, então uma exclusão acidental = perda irreversível.
--
-- Com este campo, a exclusão passa a marcar deleted_at (lixeira). O orçamento
-- some das listagens mas pode ser restaurado, e nada em cascata é apagado.

ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.budgets.deleted_at IS
  'Quando preenchido, o orçamento está na lixeira (soft-delete): oculto das listagens, restaurável. NULL = ativo.';

-- Acelera o filtro "deleted_at IS NULL" das listagens e a busca da lixeira.
CREATE INDEX IF NOT EXISTS idx_budgets_deleted_at ON public.budgets (deleted_at);
