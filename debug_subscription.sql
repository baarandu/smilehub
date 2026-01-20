
-- Check the last 5 subscriptions created
SELECT 
    s.id,
    s.clinic_id,
    s.status,
    p.name as plan_name,
    s.created_at,
    s.updated_at
FROM subscriptions s
LEFT JOIN subscription_plans p ON s.plan_id = p.id
ORDER BY s.created_at DESC
LIMIT 5;

-- Check exact plan Ids
SELECT id, name, price_monthly FROM subscription_plans;
