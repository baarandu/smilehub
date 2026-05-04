-- Fix RLS de budgets/budget_items: secretária recebe 42501 ao criar plano
-- de tratamento mesmo com clinic_id correto. Provavelmente existe uma policy
-- antiga (criada via dashboard) com nome diferente que ainda está ativa e
-- bloqueia INSERT por role, e o DROP IF EXISTS de 20260228 não pegou ela.
--
-- Estratégia: dropar TODAS as policies das duas tabelas dinamicamente e
-- recriar as canônicas. Membro da clínica pode CRUD em budgets/budget_items
-- (mesma logica original em 20260228, sem checagem por role — secretaria
-- precisa criar plano de tratamento como parte do trabalho).

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'budgets'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.budgets', pol.policyname);
  END LOOP;

  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'budget_items'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.budget_items', pol.policyname);
  END LOOP;
END $$;

-- ---- budgets ----
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budgets_select" ON budgets FOR SELECT
  USING (user_is_clinic_member(auth.uid(), budgets.clinic_id));

CREATE POLICY "budgets_insert" ON budgets FOR INSERT
  WITH CHECK (user_is_clinic_member(auth.uid(), budgets.clinic_id));

CREATE POLICY "budgets_update" ON budgets FOR UPDATE
  USING (user_is_clinic_member(auth.uid(), budgets.clinic_id));

CREATE POLICY "budgets_delete" ON budgets FOR DELETE
  USING (user_is_clinic_member(auth.uid(), budgets.clinic_id));

-- ---- budget_items ----
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "budget_items_select" ON budget_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budgets b
      WHERE b.id = budget_items.budget_id
        AND user_is_clinic_member(auth.uid(), b.clinic_id)
    )
  );

CREATE POLICY "budget_items_insert" ON budget_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budgets b
      WHERE b.id = budget_items.budget_id
        AND user_is_clinic_member(auth.uid(), b.clinic_id)
    )
  );

CREATE POLICY "budget_items_update" ON budget_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM budgets b
      WHERE b.id = budget_items.budget_id
        AND user_is_clinic_member(auth.uid(), b.clinic_id)
    )
  );

CREATE POLICY "budget_items_delete" ON budget_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM budgets b
      WHERE b.id = budget_items.budget_id
        AND user_is_clinic_member(auth.uid(), b.clinic_id)
    )
  );
