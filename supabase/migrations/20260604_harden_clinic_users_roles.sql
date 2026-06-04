-- Harden clinic_users membership and role management after pentest findings #4 and #16.
-- Client writes go through SECURITY DEFINER RPCs that validate clinic adminship and role values.

ALTER TABLE public.clinic_users ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  valid_roles text[] := ARRAY['admin', 'dentist', 'assistant', 'manager', 'editor', 'viewer'];
BEGIN
  UPDATE public.clinic_users cu
  SET role = 'viewer'
  WHERE cu.role IS NULL OR NOT (cu.role = ANY(valid_roles));

  UPDATE public.clinic_users cu
  SET roles = ARRAY[cu.role]
  WHERE cu.roles IS NULL
    OR array_length(cu.roles, 1) IS NULL
    OR NOT (cu.roles <@ valid_roles);
END $$;

ALTER TABLE public.clinic_users
  DROP CONSTRAINT IF EXISTS clinic_users_roles_valid;

ALTER TABLE public.clinic_users
  ADD CONSTRAINT clinic_users_roles_valid
  CHECK (
    roles IS NOT NULL
    AND array_length(roles, 1) > 0
    AND roles <@ ARRAY['admin', 'dentist', 'assistant', 'manager', 'editor', 'viewer']::text[]
  );

ALTER TABLE public.clinic_users
  DROP CONSTRAINT IF EXISTS clinic_users_role_valid;

ALTER TABLE public.clinic_users
  ADD CONSTRAINT clinic_users_role_valid
  CHECK (role IN ('admin', 'dentist', 'assistant', 'manager', 'editor', 'viewer'));

DROP POLICY IF EXISTS "cu_select" ON public.clinic_users;
CREATE POLICY "cu_select" ON public.clinic_users
  FOR SELECT
  USING (
    user_is_clinic_member(auth.uid(), clinic_users.clinic_id)
  );

DROP POLICY IF EXISTS "cu_insert" ON public.clinic_users;
DROP POLICY IF EXISTS "cu_update" ON public.clinic_users;
DROP POLICY IF EXISTS "cu_delete" ON public.clinic_users;

REVOKE INSERT, UPDATE, DELETE ON public.clinic_users FROM anon, authenticated;

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
    valid_roles text[] := ARRAY['admin', 'dentist', 'assistant', 'manager', 'editor', 'viewer'];
BEGIN
    IF p_role IS NULL OR NOT (p_role = ANY(valid_roles)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cargo inválido');
    END IF;

    IF NOT user_has_any_role(auth.uid(), p_clinic_id, ARRAY['admin']) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Você não tem permissão para convidar usuários');
    END IF;

    SELECT id INTO v_user_id
    FROM auth.users
    WHERE LOWER(email) = LOWER(p_email);

    IF v_user_id IS NOT NULL THEN
        SELECT EXISTS(
            SELECT 1
            FROM public.clinic_users
            WHERE clinic_id = p_clinic_id AND user_id = v_user_id
        ) INTO v_already_member;

        IF v_already_member THEN
            RETURN jsonb_build_object('success', false, 'error', 'Este usuário já faz parte da clínica');
        END IF;

        INSERT INTO public.clinic_users (user_id, clinic_id, role, roles)
        VALUES (v_user_id, p_clinic_id, p_role, ARRAY[p_role]);

        RETURN jsonb_build_object(
            'success', true,
            'action', 'added_directly',
            'message', 'Usuário adicionado à clínica com sucesso!'
        );
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.clinic_invites
        WHERE clinic_id = p_clinic_id
          AND LOWER(email) = LOWER(p_email)
          AND status = 'pending'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Já existe um convite pendente para este email');
    END IF;

    INSERT INTO public.clinic_invites (clinic_id, email, role, status)
    VALUES (p_clinic_id, LOWER(p_email), p_role, 'pending');

    RETURN jsonb_build_object(
        'success', true,
        'action', 'invite_created',
        'message', 'Convite enviado! O usuário será adicionado quando criar uma conta.'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_roles(
  p_clinic_user_id uuid,
  p_roles text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_id uuid;
  valid_roles text[] := ARRAY['admin', 'dentist', 'assistant', 'manager', 'editor', 'viewer'];
  admin_count int;
BEGIN
  IF p_roles IS NULL OR array_length(p_roles, 1) IS NULL OR array_length(p_roles, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pelo menos um cargo deve ser selecionado');
  END IF;

  IF NOT (p_roles <@ valid_roles) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cargo inválido');
  END IF;

  SELECT clinic_id INTO v_clinic_id
  FROM public.clinic_users
  WHERE id = p_clinic_user_id;

  IF v_clinic_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Membro não encontrado');
  END IF;

  IF NOT user_has_any_role(auth.uid(), v_clinic_id, ARRAY['admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;

  IF NOT ('admin' = ANY(p_roles)) THEN
    SELECT count(*) INTO admin_count
    FROM public.clinic_users
    WHERE clinic_id = v_clinic_id
      AND 'admin' = ANY(roles)
      AND id != p_clinic_user_id;

    IF admin_count = 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'A clínica deve ter pelo menos um administrador');
    END IF;
  END IF;

  UPDATE public.clinic_users
  SET roles = p_roles
  WHERE id = p_clinic_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Cargos atualizados com sucesso');
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_clinic_member(
  p_clinic_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_id uuid;
  v_target_user_id uuid;
  v_target_roles text[];
  admin_count int;
BEGIN
  SELECT clinic_id, user_id, roles
  INTO v_clinic_id, v_target_user_id, v_target_roles
  FROM public.clinic_users
  WHERE id = p_clinic_user_id;

  IF v_clinic_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Membro não encontrado');
  END IF;

  IF NOT user_has_any_role(auth.uid(), v_clinic_id, ARRAY['admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;

  IF v_target_user_id = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você não pode remover o próprio acesso');
  END IF;

  IF 'admin' = ANY(COALESCE(v_target_roles, '{}')) THEN
    SELECT count(*) INTO admin_count
    FROM public.clinic_users
    WHERE clinic_id = v_clinic_id
      AND 'admin' = ANY(roles)
      AND id != p_clinic_user_id;

    IF admin_count = 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'A clínica deve ter pelo menos um administrador');
    END IF;
  END IF;

  DELETE FROM public.clinic_users
  WHERE id = p_clinic_user_id;

  RETURN jsonb_build_object('success', true, 'message', 'Membro removido com sucesso');
END;
$$;

REVOKE ALL ON FUNCTION public.invite_or_add_user(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_user_roles(uuid, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_clinic_member(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.invite_or_add_user(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_roles(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_clinic_member(uuid) TO authenticated;
