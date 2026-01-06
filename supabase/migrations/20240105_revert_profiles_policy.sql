-- Revert the policy that likely caused recursion
drop policy if exists "Users can view profiles of clinic members" on public.profiles;
