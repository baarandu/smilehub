-- =============================================================
-- Fix: troca o índice unique parcial de card_fee_config por um não-parcial
-- Motivo: PostgREST não detecta índice parcial em `on_conflict`,
--         causando 42P10 ("no unique or exclusion constraint matching
--         the ON CONFLICT specification") ao salvar regra de taxa.
-- =============================================================

-- 1) Backfill: pra cada clínica com linhas sem maquininha, atrela à
--    "Maquininha Principal" (criando se ainda não existir)
DO $$
DECLARE
  v_clinic_id UUID;
  v_machine_id UUID;
BEGIN
  FOR v_clinic_id IN
    SELECT DISTINCT clinic_id
    FROM card_fee_config
    WHERE card_machine_id IS NULL AND clinic_id IS NOT NULL
  LOOP
    SELECT id INTO v_machine_id
    FROM card_machines
    WHERE clinic_id = v_clinic_id
      AND lower(name) = 'maquininha principal'
      AND active = true
    LIMIT 1;

    IF v_machine_id IS NULL THEN
      INSERT INTO card_machines (clinic_id, name, active)
      VALUES (v_clinic_id, 'Maquininha Principal', true)
      RETURNING id INTO v_machine_id;
    END IF;

    UPDATE card_fee_config
    SET card_machine_id = v_machine_id
    WHERE clinic_id = v_clinic_id
      AND card_machine_id IS NULL;
  END LOOP;
END $$;

-- 2) Remove órfãos restantes (sem clinic_id E sem maquininha)
DELETE FROM card_fee_config WHERE card_machine_id IS NULL;

-- 3) Recria o índice unique sem o WHERE parcial
DROP INDEX IF EXISTS uq_card_fee_config_machine_brand_type_installments;

CREATE UNIQUE INDEX uq_card_fee_config_machine_brand_type_installments
  ON card_fee_config(card_machine_id, brand, payment_type, installments);

-- 4) Garante NOT NULL pra preservar a invariante (o app já bloqueia,
--    isto é defense in depth)
ALTER TABLE card_fee_config ALTER COLUMN card_machine_id SET NOT NULL;
