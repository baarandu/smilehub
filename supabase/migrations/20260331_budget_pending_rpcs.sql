-- Helper: safely parse text to jsonb, returns null on invalid JSON
CREATE OR REPLACE FUNCTION try_parse_jsonb(input text)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  RETURN input::jsonb;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- RPC: get_pending_budget_items
-- Returns all pending teeth from budgets, with patient info.
-- Replaces client-side JSON parsing in getAllPending().
CREATE OR REPLACE FUNCTION get_pending_budget_items(p_clinic_id uuid)
RETURNS TABLE (
  budget_id uuid,
  patient_id uuid,
  patient_name text,
  budget_date date,
  tooth jsonb,
  total_budget_value numeric
)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT
    b.id        AS budget_id,
    b.patient_id,
    p.name      AS patient_name,
    b.date      AS budget_date,
    t.value     AS tooth,
    b.value     AS total_budget_value
  FROM budgets b
  INNER JOIN patients p ON p.id = b.patient_id AND p.deleted_at IS NULL
  CROSS JOIN LATERAL jsonb_array_elements(
    COALESCE(try_parse_jsonb(b.notes) -> 'teeth', '[]'::jsonb)
  ) AS t(value)
  WHERE b.clinic_id = p_clinic_id
    AND try_parse_jsonb(b.notes) IS NOT NULL
    AND t.value ->> 'status' = 'pending';
$$;

-- RPC: get_pending_budget_count
-- Returns the total number of pending teeth across all budgets in a clinic.
-- Replaces client-side counting in getPendingCount().
CREATE OR REPLACE FUNCTION get_pending_budget_count(p_clinic_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT COALESCE(count(*)::integer, 0)
  FROM budgets b
  INNER JOIN patients p ON p.id = b.patient_id AND p.deleted_at IS NULL
  CROSS JOIN LATERAL jsonb_array_elements(
    COALESCE(try_parse_jsonb(b.notes) -> 'teeth', '[]'::jsonb)
  ) AS t(value)
  WHERE b.clinic_id = p_clinic_id
    AND try_parse_jsonb(b.notes) IS NOT NULL
    AND t.value ->> 'status' = 'pending';
$$;

-- RPC: get_pending_patients_count
-- Returns the number of distinct patients with at least one pending tooth.
-- Replaces client-side counting in getPendingPatientsCount().
CREATE OR REPLACE FUNCTION get_pending_patients_count(p_clinic_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
  SELECT COALESCE(count(DISTINCT b.patient_id)::integer, 0)
  FROM budgets b
  INNER JOIN patients p ON p.id = b.patient_id AND p.deleted_at IS NULL
  CROSS JOIN LATERAL jsonb_array_elements(
    COALESCE(try_parse_jsonb(b.notes) -> 'teeth', '[]'::jsonb)
  ) AS t(value)
  WHERE b.clinic_id = p_clinic_id
    AND try_parse_jsonb(b.notes) IS NOT NULL
    AND t.value ->> 'status' = 'pending';
$$;
