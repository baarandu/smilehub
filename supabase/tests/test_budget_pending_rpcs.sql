-- Test: try_parse_jsonb
-- Valid JSON
DO $$
BEGIN
  ASSERT try_parse_jsonb('{"teeth":[]}') IS NOT NULL, 'try_parse_jsonb should parse valid JSON';
  ASSERT try_parse_jsonb('{"teeth":[]}') = '{"teeth":[]}'::jsonb, 'try_parse_jsonb should return correct jsonb';
  ASSERT try_parse_jsonb('not json') IS NULL, 'try_parse_jsonb should return NULL for invalid JSON';
  ASSERT try_parse_jsonb(NULL) IS NULL, 'try_parse_jsonb should return NULL for NULL input';
  ASSERT try_parse_jsonb('') IS NULL, 'try_parse_jsonb should return NULL for empty string';
  RAISE NOTICE 'PASS: try_parse_jsonb';
END $$;

-- Test: get_pending_budget_items
-- Setup test data
DO $$
DECLARE
  v_clinic_id uuid := gen_random_uuid();
  v_patient_id uuid := gen_random_uuid();
  v_budget_id uuid := gen_random_uuid();
  v_count integer;
  v_row record;
BEGIN
  -- Insert test clinic
  INSERT INTO clinics (id, name) VALUES (v_clinic_id, 'Test Clinic');

  -- Insert test patient
  INSERT INTO patients (id, name, phone, clinic_id)
  VALUES (v_patient_id, 'Paciente Teste', '11999999999', v_clinic_id);

  -- Insert budget with 2 pending + 1 completed tooth
  INSERT INTO budgets (id, patient_id, clinic_id, date, value, notes)
  VALUES (v_budget_id, v_patient_id, v_clinic_id, CURRENT_DATE, 500,
    '{"teeth":[{"name":"Dente 11","status":"pending","values":{"Restauração":"15000"}},{"name":"Dente 12","status":"pending","values":{"Limpeza":"10000"}},{"name":"Dente 13","status":"approved","values":{"Canal":"30000"}}]}'
  );

  -- Test get_pending_budget_items
  SELECT count(*) INTO v_count FROM get_pending_budget_items(v_clinic_id);
  ASSERT v_count = 2, format('get_pending_budget_items should return 2 rows, got %s', v_count);

  -- Verify data integrity
  SELECT * INTO v_row FROM get_pending_budget_items(v_clinic_id) LIMIT 1;
  ASSERT v_row.patient_name = 'Paciente Teste', 'patient_name should match';
  ASSERT v_row.budget_id = v_budget_id, 'budget_id should match';

  -- Test get_pending_budget_count
  SELECT get_pending_budget_count(v_clinic_id) INTO v_count;
  ASSERT v_count = 2, format('get_pending_budget_count should return 2, got %s', v_count);

  -- Test get_pending_patients_count
  SELECT get_pending_patients_count(v_clinic_id) INTO v_count;
  ASSERT v_count = 1, format('get_pending_patients_count should return 1, got %s', v_count);

  -- Test with deleted patient (should not appear)
  UPDATE patients SET deleted_at = now() WHERE id = v_patient_id;
  SELECT get_pending_budget_count(v_clinic_id) INTO v_count;
  ASSERT v_count = 0, format('get_pending_budget_count should return 0 for deleted patient, got %s', v_count);

  -- Test with invalid JSON notes
  UPDATE patients SET deleted_at = NULL WHERE id = v_patient_id;
  UPDATE budgets SET notes = 'not valid json' WHERE id = v_budget_id;
  SELECT get_pending_budget_count(v_clinic_id) INTO v_count;
  ASSERT v_count = 0, format('get_pending_budget_count should return 0 for invalid JSON, got %s', v_count);

  -- Test with empty clinic (no budgets)
  SELECT get_pending_budget_count(gen_random_uuid()) INTO v_count;
  ASSERT v_count = 0, 'get_pending_budget_count should return 0 for empty clinic';

  -- Cleanup
  DELETE FROM budgets WHERE id = v_budget_id;
  DELETE FROM patients WHERE id = v_patient_id;
  DELETE FROM clinics WHERE id = v_clinic_id;

  RAISE NOTICE 'PASS: get_pending_budget_items, get_pending_budget_count, get_pending_patients_count';
END $$;
