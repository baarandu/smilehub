-- Add CRO column to profiles table (per-dentist CRO)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cro text;

-- Drop and recreate get_profiles_for_users to add cro to return type
DROP FUNCTION IF EXISTS get_profiles_for_users(uuid[]);
CREATE FUNCTION get_profiles_for_users(user_ids uuid[])
RETURNS TABLE (id uuid, email text, full_name text, cro text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email::text, p.full_name, p.cro
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = ANY(user_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION get_profiles_for_users(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_profiles_for_users(uuid[]) TO service_role;

-- RPC for admin to update a team member's CRO
CREATE OR REPLACE FUNCTION update_member_cro(p_user_id uuid, p_cro text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_clinic_id uuid;
  target_clinic_id uuid;
  caller_role text;
BEGIN
  -- Get caller's clinic and role
  SELECT cu.clinic_id, cu.role INTO caller_clinic_id, caller_role
  FROM clinic_users cu
  WHERE cu.user_id = auth.uid()
  LIMIT 1;

  IF caller_role NOT IN ('admin', 'owner') THEN
    RAISE EXCEPTION 'Only admins can update member CRO';
  END IF;

  -- Get target's clinic
  SELECT cu.clinic_id INTO target_clinic_id
  FROM clinic_users cu
  WHERE cu.user_id = p_user_id
  LIMIT 1;

  IF caller_clinic_id IS NULL OR caller_clinic_id != target_clinic_id THEN
    RAISE EXCEPTION 'User is not in the same clinic';
  END IF;

  UPDATE profiles SET cro = p_cro WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_member_cro(uuid, text) TO authenticated;
