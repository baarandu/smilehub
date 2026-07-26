-- Manual plan override: lets a super admin grant any clinic a specific plan/status
-- without going through Stripe, with a lightweight audit trail. Also fixes
-- admin_get_user_activity() to expose plan_id/is_admin_override so the admin UI can
-- pre-select the current plan and show which clinics are on a manual override.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS is_admin_override boolean NOT NULL DEFAULT false;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS override_granted_by uuid REFERENCES auth.users(id);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS override_granted_at timestamptz;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS override_note text;

COMMENT ON COLUMN public.subscriptions.is_admin_override IS
  'True when this row was manually set by a super admin via admin_set_clinic_plan(), bypassing Stripe. The Stripe webhook and create-subscription must skip rows where this is true.';

-- =============================================
-- admin_set_clinic_plan: grant a clinic a plan/status manually
-- =============================================
CREATE OR REPLACE FUNCTION public.admin_set_clinic_plan(
    p_clinic_id uuid,
    p_plan_id uuid,
    p_status text DEFAULT 'active',
    p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing_id uuid;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND is_super_admin = true
    ) THEN
        RAISE EXCEPTION 'Access denied: not a super admin';
    END IF;

    IF p_status NOT IN ('active', 'trialing', 'past_due', 'canceled') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Status inválido');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM clinics WHERE id = p_clinic_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Clínica não encontrada');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM subscription_plans WHERE id = p_plan_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Plano não encontrado');
    END IF;

    SELECT id INTO v_existing_id FROM subscriptions WHERE clinic_id = p_clinic_id LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        UPDATE subscriptions
        SET plan_id = p_plan_id,
            status = p_status,
            current_period_start = now(),
            -- No expiration for admin overrides (persists until manually cleared):
            -- push far into the future rather than NULL since the column is NOT NULL
            -- and the frontend always parses it as a date.
            current_period_end = now() + interval '100 years',
            is_admin_override = true,
            override_granted_by = auth.uid(),
            override_granted_at = now(),
            override_note = p_note,
            updated_at = now()
        WHERE id = v_existing_id;
    ELSE
        INSERT INTO subscriptions (
            clinic_id, plan_id, status,
            current_period_start, current_period_end,
            is_admin_override, override_granted_by, override_granted_at, override_note
        ) VALUES (
            p_clinic_id, p_plan_id, p_status,
            now(), now() + interval '100 years',
            true, auth.uid(), now(), p_note
        );
    END IF;

    INSERT INTO audit_logs (clinic_id, user_id, action, entity, entity_id, details)
    VALUES (
        p_clinic_id, auth.uid(), 'ADMIN_PLAN_OVERRIDE', 'SUBSCRIPTION', p_clinic_id::text,
        jsonb_build_object('plan_id', p_plan_id, 'status', p_status, 'note', p_note)
    );

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_clinic_plan(uuid, uuid, text, text) TO authenticated;

-- =============================================
-- admin_clear_clinic_plan_override: revert a clinic to the normal trial/Stripe flow
-- =============================================
CREATE OR REPLACE FUNCTION public.admin_clear_clinic_plan_override(
    p_clinic_id uuid
)
RETURNS jsonb
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

    -- Only clears the flag; leaves status/plan_id/current_period_end as-is. If the
    -- clinic has a real Stripe subscription, the next webhook event will take over
    -- naturally now that the guard no longer skips it. If not, the clinic keeps
    -- whatever the override left until it goes through a real checkout.
    UPDATE subscriptions
    SET is_admin_override = false,
        override_note = NULL,
        updated_at = now()
    WHERE clinic_id = p_clinic_id;

    INSERT INTO audit_logs (clinic_id, user_id, action, entity, entity_id, details)
    VALUES (p_clinic_id, auth.uid(), 'ADMIN_PLAN_OVERRIDE_CLEARED', 'SUBSCRIPTION', p_clinic_id::text, '{}'::jsonb);

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_clear_clinic_plan_override(uuid) TO authenticated;

-- =============================================
-- admin_get_user_activity: expose plan_id/is_admin_override for the admin UI
-- =============================================
-- Postgres won't let CREATE OR REPLACE change a function's RETURNS TABLE shape —
-- must drop it first since we're adding plan_id/is_admin_override columns.
DROP FUNCTION IF EXISTS admin_get_user_activity();

CREATE OR REPLACE FUNCTION admin_get_user_activity()
RETURNS TABLE (
    id uuid,
    email text,
    full_name text,
    created_at timestamptz,
    clinic_id uuid,
    clinic_name text,
    subscription_status text,
    plan_id uuid,
    plan_name text,
    is_admin_override boolean,
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
    )
    SELECT
        pr.id,
        u.email::text,
        pr.full_name,
        pr.created_at,
        cu.clinic_id,
        c.name::text AS clinic_name,
        s.status::text AS subscription_status,
        s.plan_id,
        sp.name::text AS plan_name,
        COALESCE(s.is_admin_override, false) AS is_admin_override,
        s.current_period_end AS trial_ends_at,
        u.last_sign_in_at,
        GREATEST(u.last_sign_in_at, pat.last_ts, app.last_ts, bud.last_ts, fin.last_ts, ana.last_ts) AS last_activity_at,
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
    ORDER BY 13 DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_user_activity() TO authenticated;
