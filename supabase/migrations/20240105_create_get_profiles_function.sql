-- Create a secure function to fetch profile info by IDs
-- This bypasses RLS to avoid recursion loops when checking clinic membership
create or replace function get_profiles_for_users(user_ids uuid[])
returns table (id uuid, email text, full_name text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select p.id, p.email, p.full_name
  from profiles p
  where p.id = any(user_ids);
end;
$$;
