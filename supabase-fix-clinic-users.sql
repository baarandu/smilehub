-- FIX: Create clinic and link for users who don't have one
-- This creates a default clinic for each user that doesn't have one

-- 1. Create clinics for users who don't have one
INSERT INTO clinics (name)
SELECT 'Minha Clínica'
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM clinic_users cu WHERE cu.user_id = p.id
)
ON CONFLICT DO NOTHING;

-- 2. Link users to their new clinics
-- First, let's do this in a simpler way - for each user without a clinic_users entry,
-- create a clinic and link them

DO $$
DECLARE
    user_record RECORD;
    new_clinic_id UUID;
BEGIN
    FOR user_record IN 
        SELECT p.id as user_id, p.full_name
        FROM profiles p
        WHERE NOT EXISTS (
            SELECT 1 FROM clinic_users cu WHERE cu.user_id = p.id
        )
    LOOP
        -- Create a new clinic for this user
        INSERT INTO clinics (name) 
        VALUES (COALESCE(user_record.full_name, 'Minha Clínica'))
        RETURNING id INTO new_clinic_id;
        
        -- Link the user to the clinic
        INSERT INTO clinic_users (user_id, clinic_id, role)
        VALUES (user_record.user_id, new_clinic_id, 'owner');
        
        RAISE NOTICE 'Created clinic % for user %', new_clinic_id, user_record.user_id;
    END LOOP;
END $$;

-- Verify the fix
SELECT 
    p.id as user_id,
    p.full_name,
    c.id as clinic_id,
    c.name as clinic_name
FROM profiles p
LEFT JOIN clinic_users cu ON cu.user_id = p.id
LEFT JOIN clinics c ON c.id = cu.clinic_id;
