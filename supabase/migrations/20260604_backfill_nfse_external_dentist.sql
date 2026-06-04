-- Backfill dentist_id for NFS-e records marked as issued externally.
--
-- Historical records created from the Payments tab can be safely linked back
-- to the dentist responsible for the budget. Prefer the explicit
-- responsibleDentistId saved in budget notes when present; otherwise use
-- budgets.created_by, which is the dentist login that created the budget.
DO $$
DECLARE
  row_to_fix record;
  resolved_dentist_id uuid;
BEGIN
  FOR row_to_fix IN
    SELECT
      n.id AS nfse_id,
      n.dentist_id AS current_dentist_id,
      b.created_by AS budget_created_by,
      b.notes AS budget_notes
    FROM public.nfse_documents n
    JOIN public.budgets b
      ON b.id = n.budget_id
     AND b.clinic_id = n.clinic_id
    WHERE n.issued_externally = true
      AND n.budget_id IS NOT NULL
      AND n.status != 'canceled'
  LOOP
    resolved_dentist_id := NULL;

    IF row_to_fix.budget_notes IS NOT NULL THEN
      BEGIN
        resolved_dentist_id :=
          NULLIF(row_to_fix.budget_notes::jsonb ->> 'responsibleDentistId', '')::uuid;
      EXCEPTION WHEN others THEN
        resolved_dentist_id := NULL;
      END;
    END IF;

    resolved_dentist_id := COALESCE(resolved_dentist_id, row_to_fix.budget_created_by);

    IF resolved_dentist_id IS NOT NULL
      AND row_to_fix.current_dentist_id IS DISTINCT FROM resolved_dentist_id
    THEN
      UPDATE public.nfse_documents
      SET
        dentist_id = resolved_dentist_id,
        updated_at = now()
      WHERE id = row_to_fix.nfse_id;
    END IF;
  END LOOP;
END $$;
