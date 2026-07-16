-- Heartbeat de sessão: registra uso da aplicação mesmo sem ações de escrita
-- (1 linha por usuário por dia, atualizada via RPC pelo frontend a cada ~5 min).
CREATE TABLE IF NOT EXISTS public.user_heartbeats (
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day date NOT NULL,
    first_seen_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    pings int NOT NULL DEFAULT 1,
    PRIMARY KEY (user_id, day)
);

-- RLS sem policies: a tabela só é acessada via funções SECURITY DEFINER.
ALTER TABLE public.user_heartbeats ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.record_heartbeat()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO user_heartbeats (user_id, day)
    VALUES (auth.uid(), (now() AT TIME ZONE 'utc')::date)
    ON CONFLICT (user_id, day)
    DO UPDATE SET
        last_seen_at = now(),
        pings = user_heartbeats.pings + 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_heartbeat() TO authenticated;

-- Atualiza a última atividade da aba "Atividade & Uso" para considerar heartbeats.
CREATE OR REPLACE FUNCTION admin_get_user_activity()
RETURNS TABLE (
    id uuid,
    email text,
    full_name text,
    created_at timestamptz,
    clinic_id uuid,
    clinic_name text,
    subscription_status text,
    plan_name text,
    trial_ends_at timestamptz,
    last_sign_in_at timestamptz,
    last_activity_at timestamptz,
    patients_count bigint,
    patients_last_30d bigint,
    patients_prev_30d bigint,
    appointments_count bigint,
    budgets_count bigint,
    transactions_count bigint,
    anamneses_count bigint
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
    WITH pat AS (
        SELECT p.clinic_id AS cid,
               COUNT(*) AS cnt,
               COUNT(*) FILTER (WHERE p.created_at >= now() - interval '30 days') AS last30,
               COUNT(*) FILTER (WHERE p.created_at >= now() - interval '60 days'
                                  AND p.created_at < now() - interval '30 days') AS prev30,
               MAX(GREATEST(p.created_at, p.updated_at)) AS last_ts
        FROM patients p
        WHERE p.clinic_id IS NOT NULL
        GROUP BY p.clinic_id
    ),
    app AS (
        SELECT a.clinic_id AS cid,
               COUNT(*) AS cnt,
               MAX(GREATEST(a.created_at, a.updated_at)) AS last_ts
        FROM appointments a
        WHERE a.clinic_id IS NOT NULL
        GROUP BY a.clinic_id
    ),
    bud AS (
        SELECT b.clinic_id AS cid,
               COUNT(*) AS cnt,
               MAX(GREATEST(b.created_at, b.updated_at)) AS last_ts
        FROM budgets b
        WHERE b.clinic_id IS NOT NULL
        GROUP BY b.clinic_id
    ),
    fin AS (
        SELECT f.clinic_id AS cid,
               COUNT(*) AS cnt,
               MAX(GREATEST(f.created_at, f.updated_at)) AS last_ts
        FROM financial_transactions f
        WHERE f.clinic_id IS NOT NULL
        GROUP BY f.clinic_id
    ),
    ana AS (
        SELECT an.clinic_id AS cid,
               COUNT(*) AS cnt,
               MAX(GREATEST(an.created_at, an.updated_at)) AS last_ts
        FROM anamneses an
        WHERE an.clinic_id IS NOT NULL
        GROUP BY an.clinic_id
    ),
    hb AS (
        SELECT h.user_id AS uid,
               MAX(h.last_seen_at) AS last_ts
        FROM user_heartbeats h
        GROUP BY h.user_id
    )
    SELECT
        pr.id,
        u.email::text,
        pr.full_name,
        pr.created_at,
        cu.clinic_id,
        c.name::text AS clinic_name,
        s.status::text AS subscription_status,
        sp.name::text AS plan_name,
        s.current_period_end AS trial_ends_at,
        u.last_sign_in_at,
        GREATEST(u.last_sign_in_at, hb.last_ts, pat.last_ts, app.last_ts, bud.last_ts, fin.last_ts, ana.last_ts) AS last_activity_at,
        COALESCE(pat.cnt, 0) AS patients_count,
        COALESCE(pat.last30, 0) AS patients_last_30d,
        COALESCE(pat.prev30, 0) AS patients_prev_30d,
        COALESCE(app.cnt, 0) AS appointments_count,
        COALESCE(bud.cnt, 0) AS budgets_count,
        COALESCE(fin.cnt, 0) AS transactions_count,
        COALESCE(ana.cnt, 0) AS anamneses_count
    FROM profiles pr
    JOIN auth.users u ON u.id = pr.id
    LEFT JOIN clinic_users cu ON cu.user_id = pr.id
    LEFT JOIN clinics c ON c.id = cu.clinic_id
    LEFT JOIN subscriptions s ON s.clinic_id = cu.clinic_id
    LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
    LEFT JOIN pat ON pat.cid = cu.clinic_id
    LEFT JOIN app ON app.cid = cu.clinic_id
    LEFT JOIN bud ON bud.cid = cu.clinic_id
    LEFT JOIN fin ON fin.cid = cu.clinic_id
    LEFT JOIN ana ON ana.cid = cu.clinic_id
    LEFT JOIN hb ON hb.uid = pr.id
    ORDER BY 11 DESC NULLS LAST;
END;
$$;

-- Atualiza a série DAU/WAU/MAU para unir audit_logs + heartbeats.
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
    WITH events AS (
        SELECT al.user_id AS uid, al.created_at::date AS event_day
        FROM audit_logs al
        WHERE al.user_id IS NOT NULL
        UNION
        SELECT h.user_id AS uid, h.day AS event_day
        FROM user_heartbeats h
    )
    SELECT
        d::date AS day,
        (SELECT COUNT(DISTINCT e.uid) FROM events e
          WHERE e.event_day = d::date) AS dau,
        (SELECT COUNT(DISTINCT e.uid) FROM events e
          WHERE e.event_day BETWEEN d::date - 6 AND d::date) AS wau,
        (SELECT COUNT(DISTINCT e.uid) FROM events e
          WHERE e.event_day BETWEEN d::date - 29 AND d::date) AS mau
    FROM generate_series(
        (now() AT TIME ZONE 'utc')::date - (p_days - 1),
        (now() AT TIME ZONE 'utc')::date,
        interval '1 day'
    ) AS d;
END;
$$;
