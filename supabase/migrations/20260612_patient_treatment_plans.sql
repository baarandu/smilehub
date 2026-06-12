-- Patient subscriptions to treatment plans (memberships).
-- A subscription freezes the plan terms (plan_snapshot) at enrollment time, so
-- editing the plan template later does not change existing memberships.
-- Runs after 20260612_clinic_treatment_plans.sql (alphabetical order).

CREATE TABLE IF NOT EXISTS patient_treatment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES clinic_treatment_plans(id) ON DELETE SET NULL,
  -- frozen copy of the plan terms at enrollment
  plan_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  start_date date NOT NULL DEFAULT current_date,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_treatment_plans_patient
  ON patient_treatment_plans (patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_treatment_plans_clinic
  ON patient_treatment_plans (clinic_id);

-- At most one active subscription per patient.
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_treatment_plans_one_active
  ON patient_treatment_plans (patient_id)
  WHERE status = 'active';

ALTER TABLE patient_treatment_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic members can view patient plans" ON patient_treatment_plans;
CREATE POLICY "Clinic members can view patient plans"
  ON patient_treatment_plans FOR SELECT
  USING (user_is_clinic_member(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic members can insert patient plans" ON patient_treatment_plans;
CREATE POLICY "Clinic members can insert patient plans"
  ON patient_treatment_plans FOR INSERT
  WITH CHECK (user_is_clinic_member(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic members can update patient plans" ON patient_treatment_plans;
CREATE POLICY "Clinic members can update patient plans"
  ON patient_treatment_plans FOR UPDATE
  USING (user_is_clinic_member(auth.uid(), clinic_id))
  WITH CHECK (user_is_clinic_member(auth.uid(), clinic_id));

DROP POLICY IF EXISTS "Clinic members can delete patient plans" ON patient_treatment_plans;
CREATE POLICY "Clinic members can delete patient plans"
  ON patient_treatment_plans FOR DELETE
  USING (user_is_clinic_member(auth.uid(), clinic_id));

CREATE OR REPLACE FUNCTION update_patient_treatment_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_patient_treatment_plans_updated_at ON patient_treatment_plans;
CREATE TRIGGER trigger_update_patient_treatment_plans_updated_at
  BEFORE UPDATE ON patient_treatment_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_treatment_plans_updated_at();
