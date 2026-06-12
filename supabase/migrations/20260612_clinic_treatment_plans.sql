-- Treatment plans (membership templates) offered by the clinic.
-- A plan has three layers:
--   1. Included consultations (consumable balance, e.g. "3 profilaxias/ano")
--   2. Discount rules per treatment category (e.g. "Restauração 30%", "Urgência 50% max 1)
--   3. Perks (free-text benefits, e.g. "1 kit de higiene bucal infantil")
--
-- This migration is additive/idempotent: if an earlier version of the table
-- already exists, the ALTERs upgrade it to the richer schema.

CREATE TABLE IF NOT EXISTS clinic_treatment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  subtitle text,
  duration_months integer NOT NULL DEFAULT 12 CHECK (duration_months > 0),
  included_consultations integer NOT NULL DEFAULT 0 CHECK (included_consultations >= 0),
  -- treatment names that count against the included-consultations balance
  included_consultation_treatments jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- [{ id, label, treatments: text[], percent, max_uses: int|null }]
  discount_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- ["1 kit de higiene bucal infantil", ...]
  perks jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Upgrade path for tables created by the earlier (single-discount) version.
ALTER TABLE clinic_treatment_plans
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS included_consultations integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS included_consultation_treatments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS discount_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS perks jsonb NOT NULL DEFAULT '[]'::jsonb;

-- The old single-discount columns (discount_type/discount_value) and the old
-- consultations_included column, if present, are left in place but unused.
-- Drop NOT NULL on them so new inserts that omit them don't fail.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'clinic_treatment_plans' AND column_name = 'discount_type') THEN
    EXECUTE 'ALTER TABLE clinic_treatment_plans ALTER COLUMN discount_type DROP NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'clinic_treatment_plans' AND column_name = 'discount_value') THEN
    EXECUTE 'ALTER TABLE clinic_treatment_plans ALTER COLUMN discount_value DROP NOT NULL';
  END IF;
  -- carry forward any data from the old column name, then relax it
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'clinic_treatment_plans' AND column_name = 'consultations_included') THEN
    EXECUTE 'UPDATE clinic_treatment_plans SET included_consultations = consultations_included
             WHERE included_consultations = 0 AND consultations_included IS NOT NULL';
    EXECUTE 'ALTER TABLE clinic_treatment_plans ALTER COLUMN consultations_included DROP NOT NULL';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clinic_treatment_plans_unique_active_name
  ON clinic_treatment_plans (clinic_id, lower(name))
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_clinic_treatment_plans_clinic_id
  ON clinic_treatment_plans (clinic_id);

ALTER TABLE clinic_treatment_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic members can view treatment plans" ON clinic_treatment_plans;
CREATE POLICY "Clinic members can view treatment plans"
  ON clinic_treatment_plans FOR SELECT
  USING (user_is_clinic_member(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic members can insert treatment plans" ON clinic_treatment_plans;
CREATE POLICY "Clinic members can insert treatment plans"
  ON clinic_treatment_plans FOR INSERT
  WITH CHECK (user_is_clinic_member(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic members can update treatment plans" ON clinic_treatment_plans;
CREATE POLICY "Clinic members can update treatment plans"
  ON clinic_treatment_plans FOR UPDATE
  USING (user_is_clinic_member(auth.uid(), clinic_id))
  WITH CHECK (user_is_clinic_member(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic members can delete treatment plans" ON clinic_treatment_plans;
CREATE POLICY "Clinic members can delete treatment plans"
  ON clinic_treatment_plans FOR DELETE
  USING (user_is_clinic_member(auth.uid(), clinic_id));

CREATE OR REPLACE FUNCTION update_clinic_treatment_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_clinic_treatment_plans_updated_at ON clinic_treatment_plans;
CREATE TRIGGER trigger_update_clinic_treatment_plans_updated_at
  BEFORE UPDATE ON clinic_treatment_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_clinic_treatment_plans_updated_at();
