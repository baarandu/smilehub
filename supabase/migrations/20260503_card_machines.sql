-- =============================================================
-- Card Machines (maquininhas de cartão)
-- Permite cadastrar múltiplas maquininhas por clínica, cada uma
-- com taxas próprias, opcionalmente atrelada a um(a) dentista.
-- =============================================================

CREATE TABLE IF NOT EXISTS card_machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dentist_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_card_machines_clinic ON card_machines(clinic_id);
CREATE INDEX IF NOT EXISTS idx_card_machines_dentist ON card_machines(dentist_id) WHERE dentist_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_card_machines_clinic_name
  ON card_machines(clinic_id, lower(name)) WHERE active = true;

ALTER TABLE card_machines ENABLE ROW LEVEL SECURITY;

CREATE POLICY card_machines_select ON card_machines FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY card_machines_insert ON card_machines FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY card_machines_update ON card_machines FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY card_machines_delete ON card_machines FOR DELETE
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

-- =============================================================
-- card_fee_config: passa a referenciar card_machines
-- =============================================================

ALTER TABLE card_fee_config
  ADD COLUMN IF NOT EXISTS card_machine_id UUID REFERENCES card_machines(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_card_fee_config_machine
  ON card_fee_config(card_machine_id) WHERE card_machine_id IS NOT NULL;

-- Backfill: para cada usuário com card_fee_config, cria uma "Maquininha Principal"
-- na clínica desse usuário e associa as taxas existentes a ela.
DO $$
DECLARE
  rec RECORD;
  v_clinic_id UUID;
  v_machine_id UUID;
BEGIN
  FOR rec IN
    SELECT DISTINCT user_id
    FROM card_fee_config
    WHERE card_machine_id IS NULL
  LOOP
    SELECT clinic_id INTO v_clinic_id
    FROM clinic_users
    WHERE user_id = rec.user_id
    ORDER BY created_at ASC NULLS LAST
    LIMIT 1;

    IF v_clinic_id IS NULL THEN
      CONTINUE;
    END IF;

    SELECT id INTO v_machine_id
    FROM card_machines
    WHERE clinic_id = v_clinic_id AND lower(name) = 'maquininha principal'
    LIMIT 1;

    IF v_machine_id IS NULL THEN
      INSERT INTO card_machines (clinic_id, name, active)
      VALUES (v_clinic_id, 'Maquininha Principal', true)
      RETURNING id INTO v_machine_id;
    END IF;

    UPDATE card_fee_config
    SET card_machine_id = v_machine_id
    WHERE user_id = rec.user_id AND card_machine_id IS NULL;
  END LOOP;
END $$;

-- Substitui a unique constraint antiga (user_id, brand, payment_type, installments)
-- pela nova baseada em card_machine_id (quando preenchido). Mantém a antiga só
-- como fallback para linhas sem card_machine_id.
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'card_fee_config'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) ILIKE '%user_id%brand%payment_type%installments%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE card_fee_config DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_card_fee_config_machine_brand_type_installments
  ON card_fee_config(card_machine_id, brand, payment_type, installments)
  WHERE card_machine_id IS NOT NULL;

-- =============================================================
-- financial_transactions e payment_receivables: rastreio da maquininha
-- =============================================================

ALTER TABLE financial_transactions
  ADD COLUMN IF NOT EXISTS card_machine_id UUID REFERENCES card_machines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_financial_transactions_card_machine
  ON financial_transactions(card_machine_id) WHERE card_machine_id IS NOT NULL;

ALTER TABLE payment_receivables
  ADD COLUMN IF NOT EXISTS card_machine_id UUID REFERENCES card_machines(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payment_receivables_card_machine
  ON payment_receivables(card_machine_id) WHERE card_machine_id IS NOT NULL;

-- =============================================================
-- Trigger: manter updated_at em card_machines
-- =============================================================

CREATE OR REPLACE FUNCTION trg_card_machines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS card_machines_updated_at ON card_machines;
CREATE TRIGGER card_machines_updated_at
  BEFORE UPDATE ON card_machines
  FOR EACH ROW
  EXECUTE FUNCTION trg_card_machines_updated_at();
