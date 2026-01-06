-- Allow users to view profiles of other users in the same clinic
create policy "Users can view profiles of clinic members"
  on public.profiles for select
  using (
    exists (
      select 1 from public.clinic_users cu1
      where cu1.user_id = auth.uid()
      and exists (
        select 1 from public.clinic_users cu2
        where cu2.clinic_id = cu1.clinic_id
        and cu2.user_id = profiles.id
      )
    )
  );
