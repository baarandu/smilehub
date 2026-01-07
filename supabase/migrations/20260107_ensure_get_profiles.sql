-- Create a secure function to fetch profile info by IDs
-- This bypasses RLS to avoid recursion loops when checking clinic membership
CREATE OR REPLACE FUNCTION get_profiles_for_users(user_ids uuid[])
RETURNS TABLE (id uuid, email text, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email::text, p.full_name
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  WHERE u.id = ANY(user_ids);
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION get_profiles_for_users(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_profiles_for_users(uuid[]) TO service_role;
