-- ============================================================
-- NFS-e Report by Dentist
-- Adds RPC to aggregate NFS-e records by dentist for a 
-- given period (month or full year).
-- ============================================================

-- RPC: return NFS-e records grouped by dentist
-- p_month = NULL means full year report
CREATE OR REPLACE FUNCTION public.get_nfse_report_by_dentist(
  p_clinic_id  uuid,
  p_year       int,
  p_month      int DEFAULT NULL
)
RETURNS TABLE (
  dentist_id          uuid,
  dentist_name        text,
  note_count          bigint,
  total_service_value numeric,
  notes               jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT
      n.id,
      n.dentist_id,
      n.patient_id,
      n.service_value,
      n.service_description,
      n.issue_date,
      n.issued_externally,
      p.name AS patient_name
    FROM public.nfse_documents n
    LEFT JOIN public.patients p ON p.id = n.patient_id
    WHERE n.clinic_id = p_clinic_id
      AND n.status != 'canceled'
      AND EXTRACT(YEAR FROM n.issue_date) = p_year
      AND (p_month IS NULL OR EXTRACT(MONTH FROM n.issue_date) = p_month)
      AND n.dentist_id IS NOT NULL
  )
  SELECT
    f.dentist_id,
    COALESCE(pr.full_name, au.email, 'Dentista') AS dentist_name,
    COUNT(f.id)::bigint AS note_count,
    SUM(f.service_value) AS total_service_value,
    jsonb_agg(
      jsonb_build_object(
        'id',            f.id,
        'patient_name',  COALESCE(f.patient_name, 'Avulso'),
        'issue_date',    f.issue_date,
        'service_value', f.service_value,
        'description',   f.service_description
      )
      ORDER BY f.issue_date DESC
    ) AS notes
  FROM filtered f
  LEFT JOIN public.profiles pr ON pr.id = f.dentist_id
  LEFT JOIN auth.users au      ON au.id = f.dentist_id
  GROUP BY f.dentist_id, pr.full_name, au.email
  ORDER BY total_service_value DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_nfse_report_by_dentist(uuid, int, int) TO authenticated;

COMMENT ON FUNCTION public.get_nfse_report_by_dentist IS
  'Returns NFS-e records grouped by dentist for a given year/month. Used for the accountant monthly report.';
