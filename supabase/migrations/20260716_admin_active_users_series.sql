-- Série diária de usuários ativos (DAU/WAU/MAU) para o painel admin,
-- baseada nos eventos de escrita registrados em audit_logs.
CREATE OR REPLACE FUNCTION admin_get_active_users_series(p_days int DEFAULT 90)
RETURNS TABLE (
    day date,
    dau bigint,
    wau bigint,
    mau bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND is_super_admin = true
    ) THEN
        RAISE EXCEPTION 'Access denied: not a super admin';
    END IF;

    RETURN QUERY
    SELECT
        d::date AS day,
        (SELECT COUNT(DISTINCT al.user_id) FROM audit_logs al
          WHERE al.user_id IS NOT NULL
            AND al.created_at >= d
            AND al.created_at < d + interval '1 day') AS dau,
        (SELECT COUNT(DISTINCT al.user_id) FROM audit_logs al
          WHERE al.user_id IS NOT NULL
            AND al.created_at >= d - interval '6 days'
            AND al.created_at < d + interval '1 day') AS wau,
        (SELECT COUNT(DISTINCT al.user_id) FROM audit_logs al
          WHERE al.user_id IS NOT NULL
            AND al.created_at >= d - interval '29 days'
            AND al.created_at < d + interval '1 day') AS mau
    FROM generate_series(
        (now() AT TIME ZONE 'utc')::date - (p_days - 1),
        (now() AT TIME ZONE 'utc')::date,
        interval '1 day'
    ) AS d;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_active_users_series(int) TO authenticated;

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at);
