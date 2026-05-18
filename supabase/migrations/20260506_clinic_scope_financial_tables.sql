-- =============================================================
-- Multi-tenant scope: card_fee_config, financial_settings, tax_config
--
-- Estas três tabelas eram escopadas só por user_id, então usuários com
-- múltiplas clínicas viam taxas/impostos/configurações de uma clínica
-- vazando para a outra. Esta migration adiciona clinic_id e atualiza RLS.
--
-- Caso específico tratado: usuário b2377d8b-... (sorria@barbaraqueiroz.com.br)
-- tem 2 clínicas. Todos os dados existentes pertencem a "Atendimento
-- Individual" (aad01acf-...). "Clínica Essência" (4190ff35-...) deve
-- ficar zerada.
-- =============================================================

-- 1. Adiciona clinic_id (nullable inicialmente para permitir backfill)
ALTER TABLE card_fee_config
  ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE financial_settings
  ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;

ALTER TABLE tax_config
  ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;

-- =============================================================
-- 2. Backfill — caso específico: usuário multi-clínica
-- =============================================================

UPDATE card_fee_config
SET clinic_id = 'aad01acf-a8e4-43f5-aab2-eddb9b909ab1'
WHERE user_id = 'b2377d8b-5285-4f91-bc10-ca8b1f0b0528'
  AND clinic_id IS NULL;

UPDATE financial_settings
SET clinic_id = 'aad01acf-a8e4-43f5-aab2-eddb9b909ab1'
WHERE user_id = 'b2377d8b-5285-4f91-bc10-ca8b1f0b0528'
  AND clinic_id IS NULL;

UPDATE tax_config
SET clinic_id = 'aad01acf-a8e4-43f5-aab2-eddb9b909ab1'
WHERE user_id = 'b2377d8b-5285-4f91-bc10-ca8b1f0b0528'
  AND clinic_id IS NULL;

-- =============================================================
-- 3. Backfill — card_fee_config com card_machine_id já preenchido
--    (usa o clinic_id da maquininha)
-- =============================================================

UPDATE card_fee_config cfc
SET clinic_id = cm.clinic_id
FROM card_machines cm
WHERE cfc.card_machine_id = cm.id
  AND cfc.clinic_id IS NULL;

-- =============================================================
-- 4. Backfill genérico — usuários single-clínica (primeira clínica)
-- =============================================================

DO $$
DECLARE
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['card_fee_config', 'financial_settings', 'tax_config']
  LOOP
    EXECUTE format($f$
      UPDATE %I t
      SET clinic_id = (
        SELECT clinic_id FROM clinic_users
        WHERE user_id = t.user_id
        ORDER BY created_at ASC NULLS LAST
        LIMIT 1
      )
      WHERE clinic_id IS NULL
    $f$, v_table);
  END LOOP;
END $$;

-- =============================================================
-- 5. Vincula regras legadas (sem maquininha) à "Maquininha Principal"
--    da Atendimento Individual
-- =============================================================

DO $$
DECLARE
  v_clinic_id UUID := 'aad01acf-a8e4-43f5-aab2-eddb9b909ab1';
  v_machine_id UUID;
BEGIN
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
END $$;

-- =============================================================
-- 6. Remove órfãos (linhas sem clínica nenhuma — segurança)
-- =============================================================

DELETE FROM card_fee_config WHERE clinic_id IS NULL;
DELETE FROM financial_settings WHERE clinic_id IS NULL;
DELETE FROM tax_config WHERE clinic_id IS NULL;

-- =============================================================
-- 7. NOT NULL + indexes
-- =============================================================

ALTER TABLE card_fee_config ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE financial_settings ALTER COLUMN clinic_id SET NOT NULL;
ALTER TABLE tax_config ALTER COLUMN clinic_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_card_fee_config_clinic ON card_fee_config(clinic_id);
CREATE INDEX IF NOT EXISTS idx_financial_settings_clinic ON financial_settings(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tax_config_clinic ON tax_config(clinic_id);

-- =============================================================
-- 8. UNIQUE: financial_settings passa a ser único por clínica
-- =============================================================

DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'financial_settings'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) ILIKE '%(user_id)%';

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE financial_settings DROP CONSTRAINT %I', v_constraint_name);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_settings_clinic
  ON financial_settings(clinic_id);

-- =============================================================
-- 9. RLS — card_fee_config
-- =============================================================

ALTER TABLE card_fee_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own card fees" ON card_fee_config;
DROP POLICY IF EXISTS "Users can manage their own card fees" ON card_fee_config;
DROP POLICY IF EXISTS card_fee_config_select ON card_fee_config;
DROP POLICY IF EXISTS card_fee_config_insert ON card_fee_config;
DROP POLICY IF EXISTS card_fee_config_update ON card_fee_config;
DROP POLICY IF EXISTS card_fee_config_delete ON card_fee_config;

CREATE POLICY card_fee_config_select ON card_fee_config FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY card_fee_config_insert ON card_fee_config FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY card_fee_config_update ON card_fee_config FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY card_fee_config_delete ON card_fee_config FOR DELETE
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

-- =============================================================
-- 10. RLS — financial_settings
-- =============================================================

ALTER TABLE financial_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fs_select" ON financial_settings;
DROP POLICY IF EXISTS "fs_insert" ON financial_settings;
DROP POLICY IF EXISTS "fs_update" ON financial_settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON financial_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON financial_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON financial_settings;
DROP POLICY IF EXISTS fs_delete ON financial_settings;

CREATE POLICY fs_select ON financial_settings FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY fs_insert ON financial_settings FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY fs_update ON financial_settings FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY fs_delete ON financial_settings FOR DELETE
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

-- =============================================================
-- 11. RLS — tax_config
-- =============================================================

ALTER TABLE tax_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tax_config_select ON tax_config;
DROP POLICY IF EXISTS tax_config_insert ON tax_config;
DROP POLICY IF EXISTS tax_config_update ON tax_config;
DROP POLICY IF EXISTS tax_config_delete ON tax_config;
DROP POLICY IF EXISTS "Users can view their own taxes" ON tax_config;
DROP POLICY IF EXISTS "Users can manage their own taxes" ON tax_config;

CREATE POLICY tax_config_select ON tax_config FOR SELECT
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY tax_config_insert ON tax_config FOR INSERT
  WITH CHECK (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY tax_config_update ON tax_config FOR UPDATE
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
CREATE POLICY tax_config_delete ON tax_config FOR DELETE
  USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
