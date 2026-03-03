-- =============================================================
-- Enable RLS on all 17 core tables
-- The P0 migration created policies but RLS was not activated.
-- This migration activates RLS (idempotent — safe if already on).
-- =============================================================

-- Tables with clinic_id-based policies
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

-- Tables with patient_id → clinic_id join policies
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE anamneses ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

-- Tables with budget_id → clinic_id join policy
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

-- Tables with user_id-based policies
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Self-referencing policy (clinic_id via same table)
ALTER TABLE clinic_users ENABLE ROW LEVEL SECURITY;


-- =============================================================
-- RPC: create_clinic_for_user
-- Fallback used by profile settings when a user has no clinic.
-- SECURITY DEFINER to bypass RLS (same pattern as handle_new_user).
-- =============================================================

CREATE OR REPLACE FUNCTION create_clinic_for_user(
  p_name text,
  p_address text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_id uuid;
BEGIN
  -- Ensure the caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure the user doesn't already have a clinic
  IF EXISTS (SELECT 1 FROM clinic_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'User already belongs to a clinic';
  END IF;

  -- Create the clinic
  INSERT INTO clinics (name, address, city, state, phone, email)
  VALUES (p_name, p_address, p_city, p_state, p_phone, p_email)
  RETURNING id INTO v_clinic_id;

  -- Link user as admin
  INSERT INTO clinic_users (user_id, clinic_id, role, roles)
  VALUES (auth.uid(), v_clinic_id, 'admin', ARRAY['admin']);

  RETURN v_clinic_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_clinic_for_user(text, text, text, text, text, text) TO authenticated;
