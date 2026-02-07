-- Function for super admins to get all users with subscription data
CREATE OR REPLACE FUNCTION admin_get_all_users_with_subscriptions()
RETURNS TABLE (
    id uuid,
    email text,
    full_name text,
    created_at timestamptz,
    clinic_name text,
    clinic_id uuid,
    subscription_status text,
    plan_name text,
    trial_ends_at timestamptz
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
        p.id,
        u.email::text,
        p.full_name,
        p.created_at,
        c.name::text as clinic_name,
        cu.clinic_id,
        s.status::text as subscription_status,
        sp.name::text as plan_name,
        s.current_period_end as trial_ends_at
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    LEFT JOIN clinic_users cu ON cu.user_id = p.id
    LEFT JOIN clinics c ON c.id = cu.clinic_id
    LEFT JOIN subscriptions s ON s.clinic_id = cu.clinic_id
    LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
    ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_all_users_with_subscriptions() TO authenticated;

-- Function for super admins to get overview metrics
CREATE OR REPLACE FUNCTION admin_get_overview_metrics(
    p_start_date timestamptz,
    p_end_date timestamptz
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
    v_total_clinics int;
    v_total_users int;
    v_new_users int;
    v_active_subs int;
    v_trialing_subs int;
    v_canceled_subs int;
    v_canceled_in_period int;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND is_super_admin = true
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT COUNT(*) INTO v_total_clinics FROM clinics;
    SELECT COUNT(*) INTO v_total_users FROM profiles;
    SELECT COUNT(*) INTO v_new_users FROM profiles
        WHERE created_at >= p_start_date AND created_at <= p_end_date;
    SELECT COUNT(*) INTO v_active_subs FROM subscriptions WHERE status = 'active';
    SELECT COUNT(*) INTO v_trialing_subs FROM subscriptions WHERE status = 'trialing';
    SELECT COUNT(*) INTO v_canceled_subs FROM subscriptions WHERE status = 'canceled';
    SELECT COUNT(*) INTO v_canceled_in_period FROM subscriptions
        WHERE status = 'canceled' AND updated_at >= p_start_date AND updated_at <= p_end_date;

    result := json_build_object(
        'totalClinics', v_total_clinics,
        'totalUsers', v_total_users,
        'newUsersInPeriod', v_new_users,
        'activeSubscriptions', v_active_subs,
        'trialingSubscriptions', v_trialing_subs,
        'conversionRate', CASE WHEN (v_active_subs + v_canceled_subs) > 0
            THEN ROUND((v_active_subs::numeric / (v_active_subs + v_canceled_subs)) * 100, 1)
            ELSE 0 END,
        'churnRate', CASE WHEN (v_active_subs + v_canceled_in_period) > 0
            THEN ROUND((v_canceled_in_period::numeric / (v_active_subs + v_canceled_in_period)) * 100, 1)
            ELSE 0 END
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_overview_metrics(timestamptz, timestamptz) TO authenticated;

-- Function for super admins to get recent clinics
CREATE OR REPLACE FUNCTION admin_get_recent_clinics(p_limit int DEFAULT 10)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND is_super_admin = true
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    SELECT json_agg(row_to_json(t))
    INTO result
    FROM (
        SELECT
            c.id,
            c.name,
            c.created_at as "createdAt",
            sp.name as "planName",
            s.status as "subscriptionStatus",
            (SELECT COUNT(*) FROM clinic_users cu WHERE cu.clinic_id = c.id) as "usersCount"
        FROM clinics c
        LEFT JOIN subscriptions s ON s.clinic_id = c.id
        LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
        ORDER BY c.created_at DESC
        LIMIT p_limit
    ) t;

    RETURN COALESCE(result, '[]'::json);
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_recent_clinics(int) TO authenticated;
