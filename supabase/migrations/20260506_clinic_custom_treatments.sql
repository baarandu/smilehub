-- =============================================================
-- 1. Anamnese infantil: detalhes do uso de chupeta
-- =============================================================

ALTER TABLE child_anamneses
  ADD COLUMN IF NOT EXISTS uses_pacifier_details text;

-- =============================================================
-- 2. Tratamentos personalizados por clínica
-- =============================================================

CREATE TABLE IF NOT EXISTS clinic_custom_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clinic_custom_treatments_unique
  ON clinic_custom_treatments (clinic_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_clinic_custom_treatments_clinic_id
  ON clinic_custom_treatments (clinic_id);

ALTER TABLE clinic_custom_treatments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic members can view custom treatments" ON clinic_custom_treatments;
CREATE POLICY "Clinic members can view custom treatments"
  ON clinic_custom_treatments FOR SELECT
  USING (user_is_clinic_member(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic members can insert custom treatments" ON clinic_custom_treatments;
CREATE POLICY "Clinic members can insert custom treatments"
  ON clinic_custom_treatments FOR INSERT
  WITH CHECK (user_is_clinic_member(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic members can update custom treatments" ON clinic_custom_treatments;
CREATE POLICY "Clinic members can update custom treatments"
  ON clinic_custom_treatments FOR UPDATE
  USING (user_is_clinic_member(auth.uid(), clinic_id))
  WITH CHECK (user_is_clinic_member(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic members can delete custom treatments" ON clinic_custom_treatments;
CREATE POLICY "Clinic members can delete custom treatments"
  ON clinic_custom_treatments FOR DELETE
  USING (user_is_clinic_member(auth.uid(), clinic_id));

CREATE OR REPLACE FUNCTION update_clinic_custom_treatments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_clinic_custom_treatments_updated_at ON clinic_custom_treatments;
CREATE TRIGGER trigger_update_clinic_custom_treatments_updated_at
  BEFORE UPDATE ON clinic_custom_treatments
  FOR EACH ROW
  EXECUTE FUNCTION update_clinic_custom_treatments_updated_at();

-- =============================================================
-- 3. Seed: Plano Semente e Plano Jardim para a Clínica Essência
--    (idempotente — usa ON CONFLICT no índice único)
-- =============================================================

INSERT INTO clinic_custom_treatments (clinic_id, name)
SELECT id, 'Plano Semente'
FROM clinics
WHERE name ILIKE '%essência%' OR name ILIKE '%essencia%'
ON CONFLICT DO NOTHING;

INSERT INTO clinic_custom_treatments (clinic_id, name)
SELECT id, 'Plano Jardim'
FROM clinics
WHERE name ILIKE '%essência%' OR name ILIKE '%essencia%'
ON CONFLICT DO NOTHING;
