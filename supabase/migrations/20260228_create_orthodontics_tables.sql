-- ============================================================
-- Central de Ortodontia — Phase 1 Tables
-- ============================================================

-- 1. orthodontic_cases — one record per treatment
CREATE TABLE IF NOT EXISTS orthodontic_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  dentist_id uuid NOT NULL REFERENCES profiles(id),

  status text NOT NULL DEFAULT 'evaluation'
    CHECK (status IN ('evaluation','planning','active','retention','completed','paused')),

  treatment_type text NOT NULL DEFAULT 'fixed_metallic'
    CHECK (treatment_type IN (
      'fixed_metallic','fixed_ceramic','fixed_self_ligating','fixed_lingual',
      'aligners','interceptive','removable','other'
    )),

  chief_complaint text,
  initial_diagnosis text,
  treatment_plan_notes text,

  estimated_duration_months int,
  return_frequency_days int DEFAULT 30,

  appliance_details text,
  upper_arch_wire text,
  lower_arch_wire text,

  current_aligner_number int,
  total_aligners int,

  started_at timestamptz,
  completed_at timestamptz,
  last_session_at timestamptz,
  next_appointment_at timestamptz,

  notes text,
  budget_id uuid REFERENCES budgets(id) ON DELETE SET NULL,

  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. orthodontic_sessions — one per appointment/maintenance
CREATE TABLE IF NOT EXISTS orthodontic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES orthodontic_cases(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL,

  appointment_date date NOT NULL DEFAULT CURRENT_DATE,

  procedures_performed text[] DEFAULT '{}',
  procedure_details text,

  upper_arch_wire_after text,
  lower_arch_wire_after text,
  elastics_prescribed text,

  aligner_number_after int,

  patient_compliance text CHECK (patient_compliance IN ('excellent','good','fair','poor') OR patient_compliance IS NULL),

  compliance_notes text,
  next_steps text,
  observations text,

  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. orthodontic_case_history — immutable audit trail
CREATE TABLE IF NOT EXISTS orthodontic_case_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES orthodontic_cases(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ortho_cases_clinic ON orthodontic_cases(clinic_id);
CREATE INDEX IF NOT EXISTS idx_ortho_cases_patient ON orthodontic_cases(patient_id);
CREATE INDEX IF NOT EXISTS idx_ortho_cases_dentist ON orthodontic_cases(dentist_id);
CREATE INDEX IF NOT EXISTS idx_ortho_cases_status ON orthodontic_cases(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_ortho_cases_next_appt ON orthodontic_cases(next_appointment_at) WHERE next_appointment_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ortho_sessions_case ON orthodontic_sessions(case_id);
CREATE INDEX IF NOT EXISTS idx_ortho_sessions_date ON orthodontic_sessions(appointment_date);

CREATE INDEX IF NOT EXISTS idx_ortho_history_case ON orthodontic_case_history(case_id);

-- ============================================================
-- Updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_ortho_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_ortho_cases_updated_at
  BEFORE UPDATE ON orthodontic_cases
  FOR EACH ROW EXECUTE FUNCTION update_ortho_updated_at();

CREATE TRIGGER tr_ortho_sessions_updated_at
  BEFORE UPDATE ON orthodontic_sessions
  FOR EACH ROW EXECUTE FUNCTION update_ortho_updated_at();

-- ============================================================
-- RLS — same pattern as prosthesis_orders
-- ============================================================
ALTER TABLE orthodontic_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE orthodontic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orthodontic_case_history ENABLE ROW LEVEL SECURITY;

-- Cases: clinic members can view
CREATE POLICY ortho_cases_select ON orthodontic_cases
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())
  );

-- Cases: dentists (admin/dentist) can insert
CREATE POLICY ortho_cases_insert ON orthodontic_cases
  FOR INSERT WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM clinic_users
      WHERE user_id = auth.uid() AND role IN ('admin','dentist')
    )
  );

-- Cases: dentists can update
CREATE POLICY ortho_cases_update ON orthodontic_cases
  FOR UPDATE USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_users
      WHERE user_id = auth.uid() AND role IN ('admin','dentist')
    )
  );

-- Cases: dentists can delete
CREATE POLICY ortho_cases_delete ON orthodontic_cases
  FOR DELETE USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_users
      WHERE user_id = auth.uid() AND role IN ('admin','dentist')
    )
  );

-- Sessions: clinic members can view
CREATE POLICY ortho_sessions_select ON orthodontic_sessions
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())
  );

-- Sessions: dentists can CUD
CREATE POLICY ortho_sessions_insert ON orthodontic_sessions
  FOR INSERT WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM clinic_users
      WHERE user_id = auth.uid() AND role IN ('admin','dentist')
    )
  );

CREATE POLICY ortho_sessions_update ON orthodontic_sessions
  FOR UPDATE USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_users
      WHERE user_id = auth.uid() AND role IN ('admin','dentist')
    )
  );

CREATE POLICY ortho_sessions_delete ON orthodontic_sessions
  FOR DELETE USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_users
      WHERE user_id = auth.uid() AND role IN ('admin','dentist')
    )
  );

-- History: clinic members can view (immutable — no insert/update/delete policies for regular users)
CREATE POLICY ortho_history_select ON orthodontic_case_history
  FOR SELECT USING (
    case_id IN (
      SELECT id FROM orthodontic_cases
      WHERE clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid())
    )
  );

-- History: dentists can insert
CREATE POLICY ortho_history_insert ON orthodontic_case_history
  FOR INSERT WITH CHECK (
    case_id IN (
      SELECT id FROM orthodontic_cases
      WHERE clinic_id IN (
        SELECT clinic_id FROM clinic_users
        WHERE user_id = auth.uid() AND role IN ('admin','dentist')
      )
    )
  );
