-- Create clinic_invites table
create table if not exists public.clinic_invites (
  id uuid default gen_random_uuid() primary key,
  clinic_id uuid references public.clinics(id) on delete cascade not null,
  email text not null,
  role text not null check (role in ('admin', 'dentist', 'assistant', 'editor', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies for clinic_invites

-- Enable RLS
alter table public.clinic_invites enable row level security;

-- Admin can view all invites for their clinic
create policy "Admins can view invites for their clinic"
  on public.clinic_invites for select
  using (
    exists (
      select 1 from public.clinic_users
      where clinic_users.user_id = auth.uid()
      and clinic_users.clinic_id = clinic_invites.clinic_id
      and clinic_users.role = 'admin'
    )
  );

-- Admin can insert invites for their clinic
create policy "Admins can insert invites for their clinic"
  on public.clinic_invites for insert
  with check (
    exists (
      select 1 from public.clinic_users
      where clinic_users.user_id = auth.uid()
      and clinic_users.clinic_id = clinic_invites.clinic_id
      and clinic_users.role = 'admin'
    )
  );

-- Admin can delete invites for their clinic
create policy "Admins can delete invites for their clinic"
  on public.clinic_invites for delete
  using (
    exists (
      select 1 from public.clinic_users
      where clinic_users.user_id = auth.uid()
      and clinic_users.clinic_id = clinic_invites.clinic_id
      and clinic_users.role = 'admin'
    )
  );
