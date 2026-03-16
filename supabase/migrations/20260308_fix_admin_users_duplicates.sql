-- Fix: Users appearing multiple times when they belong to multiple clinics.
-- Use DISTINCT ON to pick one row per user (best subscription), subquery for clinic names.

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
    SELECT DISTINCT ON (p.id)
        p.id,
        u.email::text,
        p.full_name,
        p.created_at,
        (
            SELECT string_agg(c2.name, ', ')
            FROM clinic_users cu2
            JOIN clinics c2 ON c2.id = cu2.clinic_id
            WHERE cu2.user_id = p.id
        )::text as clinic_name,
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
    ORDER BY p.id,
        CASE s.status
            WHEN 'active' THEN 1
            WHEN 'trialing' THEN 2
            WHEN 'past_due' THEN 3
            ELSE 4
        END,
        p.created_at DESC;
END;
$$;
