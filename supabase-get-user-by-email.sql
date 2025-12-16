-- =====================================================
-- RPC Function: Get user ID by email
-- Execute this in Supabase SQL Editor
-- =====================================================

-- Create function to search users by email
CREATE OR REPLACE FUNCTION get_user_id_by_email(email_input text)
RETURNS TABLE(id uuid, email text) AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email::text
  FROM auth.users au
  WHERE LOWER(au.email) = LOWER(email_input);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user email by ID
CREATE OR REPLACE FUNCTION get_user_email_by_id(user_id_input uuid)
RETURNS TABLE(id uuid, email text) AS $$
BEGIN
  RETURN QUERY
  SELECT au.id, au.email::text
  FROM auth.users au
  WHERE au.id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_id_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_email_by_id(uuid) TO authenticated;
