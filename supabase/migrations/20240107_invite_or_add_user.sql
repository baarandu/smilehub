-- CORRECTED: Function to invite a user to a clinic
-- Uses auth.users instead of profiles.email (profiles may not have email column in production)
-- If user already exists in auth.users, add them directly to clinic_users
-- If user doesn't exist, create a pending invite

-- First, drop the old version if it exists
DROP FUNCTION IF EXISTS public.invite_or_add_user(uuid, text, text);

CREATE OR REPLACE FUNCTION public.invite_or_add_user(
    p_clinic_id uuid,
    p_email text,
    p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_already_member boolean;
BEGIN
    -- 1. Check if current user is admin of this clinic
    IF NOT EXISTS (
        SELECT 1 FROM clinic_users 
        WHERE clinic_id = p_clinic_id 
        AND user_id = auth.uid() 
        AND role = 'admin'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Você não tem permissão para convidar usuários');
    END IF;

    -- 2. Check if user already exists in auth.users (has an account)
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE LOWER(email) = LOWER(p_email);

    IF v_user_id IS NOT NULL THEN
        -- User exists! Check if already a member
        SELECT EXISTS(
            SELECT 1 FROM clinic_users 
            WHERE clinic_id = p_clinic_id AND user_id = v_user_id
        ) INTO v_already_member;

        IF v_already_member THEN
            RETURN jsonb_build_object('success', false, 'error', 'Este usuário já faz parte da clínica');
        END IF;

        -- Add user directly to clinic_users
        INSERT INTO clinic_users (user_id, clinic_id, role)
        VALUES (v_user_id, p_clinic_id, p_role);

        RETURN jsonb_build_object(
            'success', true, 
            'action', 'added_directly',
            'message', 'Usuário adicionado à clínica com sucesso!'
        );
    ELSE
        -- User doesn't exist, create pending invite
        -- First check if invite already exists
        IF EXISTS (
            SELECT 1 FROM clinic_invites 
            WHERE clinic_id = p_clinic_id 
            AND LOWER(email) = LOWER(p_email) 
            AND status = 'pending'
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Já existe um convite pendente para este email');
        END IF;

        INSERT INTO clinic_invites (clinic_id, email, role, status)
        VALUES (p_clinic_id, LOWER(p_email), p_role, 'pending');

        RETURN jsonb_build_object(
            'success', true, 
            'action', 'invite_created',
            'message', 'Convite enviado! O usuário será adicionado quando criar uma conta.'
        );
    END IF;
END;
$$;
