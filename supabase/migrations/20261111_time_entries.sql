-- ============================================================
-- Controle de Ponto — registro de entrada/saída de funcionárias
-- Spec: docs/superpowers/specs/2026-11-11-controle-de-ponto-design.md
--
-- Funcionária escreve SOMENTE via RPCs clock_in/clock_out (horário do
-- servidor). Dono/admin escreve direto (correções), via RLS.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.time_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT, -- histórico de ponto deve ser preservado (retenção trabalhista)
  clock_in    timestamptz NOT NULL,
  clock_out   timestamptz NULL,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT time_entries_out_after_in CHECK (clock_out IS NULL OR clock_out > clock_in)
);

-- No máximo um ponto aberto por funcionária por clínica
CREATE UNIQUE INDEX IF NOT EXISTS uq_time_entries_open
  ON public.time_entries(clinic_id, user_id) WHERE clock_out IS NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_user_week
  ON public.time_entries(clinic_id, user_id, clock_in);

-- Limite semanal configurável (PEC 6x1: 44h → 42h → 40h)
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS weekly_hours_limit numeric(4,1) NOT NULL DEFAULT 44
  CHECK (weekly_hours_limit > 0 AND weekly_hours_limit <= 168);

-- ============================================================
-- updated_at / updated_by
-- ============================================================
CREATE OR REPLACE FUNCTION public._time_entries_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  -- dono do registro, clínica e autoria original são imutáveis
  NEW.user_id    := OLD.user_id;
  NEW.clinic_id  := OLD.clinic_id;
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public._time_entries_stamp_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid();
    NEW.updated_by := auth.uid();
  END IF;
  NEW.created_at := now();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_time_entries_stamp_insert ON public.time_entries;
CREATE TRIGGER tr_time_entries_stamp_insert
  BEFORE INSERT ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public._time_entries_stamp_insert();

DROP TRIGGER IF EXISTS tr_time_entries_touch ON public.time_entries;
CREATE TRIGGER tr_time_entries_touch
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public._time_entries_touch();

-- ============================================================
-- Helpers
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_is_clinic_owner_or_admin(p_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM clinic_users cu
    WHERE cu.clinic_id = p_clinic_id
      AND cu.user_id = auth.uid()
      AND (cu.role IN ('owner', 'admin') OR cu.roles && ARRAY['owner', 'admin'])
  );
$$;

-- membership: reutiliza user_is_clinic_member(p_user_id, p_clinic_id) (20260220_multi_role_support)

-- ============================================================
-- RPCs de batida (horário do servidor)
-- ============================================================
CREATE OR REPLACE FUNCTION public.clock_in(p_clinic_id uuid)
RETURNS public.time_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row time_entries;
BEGIN
  IF v_uid IS NULL OR NOT user_is_clinic_member(v_uid, p_clinic_id) THEN
    RAISE EXCEPTION 'Você não é membro desta clínica';
  END IF;

  IF EXISTS (
    SELECT 1 FROM time_entries
    WHERE clinic_id = p_clinic_id AND user_id = v_uid AND clock_out IS NULL
  ) THEN
    RAISE EXCEPTION 'Você já tem um ponto aberto';
  END IF;

  INSERT INTO time_entries (clinic_id, user_id, clock_in, created_by, updated_by)
  VALUES (p_clinic_id, v_uid, now(), v_uid, v_uid)
  RETURNING * INTO v_row;

  RETURN v_row;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Você já tem um ponto aberto';
END;
$$;

CREATE OR REPLACE FUNCTION public.clock_out(p_clinic_id uuid)
RETURNS public.time_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row time_entries;
BEGIN
  IF v_uid IS NULL OR NOT user_is_clinic_member(v_uid, p_clinic_id) THEN
    RAISE EXCEPTION 'Você não é membro desta clínica';
  END IF;

  UPDATE time_entries
     SET clock_out = now()
   WHERE clinic_id = p_clinic_id
     AND user_id = v_uid
     AND clock_out IS NULL
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Nenhum ponto aberto para fechar';
  END IF;

  RETURN v_row;
END;
$$;

-- Limite semanal: owner/admin (a policy clinics_update só aceita admin)
CREATE OR REPLACE FUNCTION public.set_weekly_hours_limit(p_clinic_id uuid, p_hours numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT user_is_clinic_owner_or_admin(p_clinic_id) THEN
    RAISE EXCEPTION 'Apenas o dono ou administrador pode alterar a jornada';
  END IF;
  IF p_hours IS NULL OR p_hours <= 0 OR p_hours > 168 THEN
    RAISE EXCEPTION 'Jornada semanal inválida';
  END IF;

  UPDATE clinics SET weekly_hours_limit = p_hours WHERE id = p_clinic_id;
END;
$$;

REVOKE ALL ON FUNCTION public.user_is_clinic_owner_or_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clock_in(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clock_out(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_weekly_hours_limit(uuid, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_is_clinic_owner_or_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.clock_in(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.clock_out(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_weekly_hours_limit(uuid, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.user_is_clinic_owner_or_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clock_in(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clock_out(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_weekly_hours_limit(uuid, numeric) TO authenticated;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "time_entries_select" ON public.time_entries;
CREATE POLICY "time_entries_select" ON public.time_entries FOR SELECT
  USING (
    (user_id = auth.uid() AND user_is_clinic_member(auth.uid(), clinic_id))
    OR user_is_clinic_owner_or_admin(clinic_id)
  );

DROP POLICY IF EXISTS "time_entries_insert" ON public.time_entries;
CREATE POLICY "time_entries_insert" ON public.time_entries FOR INSERT
  WITH CHECK (
    user_is_clinic_owner_or_admin(clinic_id)
    AND user_is_clinic_member(user_id, clinic_id)
  );

DROP POLICY IF EXISTS "time_entries_update" ON public.time_entries;
CREATE POLICY "time_entries_update" ON public.time_entries FOR UPDATE
  USING (user_is_clinic_owner_or_admin(clinic_id))
  WITH CHECK (user_is_clinic_owner_or_admin(clinic_id));

DROP POLICY IF EXISTS "time_entries_delete" ON public.time_entries;
CREATE POLICY "time_entries_delete" ON public.time_entries FOR DELETE
  USING (user_is_clinic_owner_or_admin(clinic_id));
