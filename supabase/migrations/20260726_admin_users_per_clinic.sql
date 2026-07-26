-- "Usuários e Assinaturas" collapsed multi-clinic users into a single row
-- (DISTINCT ON + string_agg'd clinic names), picking only the highest-priority
-- subscription's status/plan/trial date and mislabeling it under all of that
-- user's clinic names combined — misleading for anyone with more than one clinic
-- (e.g. their own trial clinic + a separate paid clinic they're a team member of).
-- Switch to one row per user×clinic pairing, matching admin_get_user_activity().

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
    ORDER BY p.created_at DESC, c.name;
END;
$$;
