create table if not exists public.audit_logs (
    id uuid default gen_random_uuid() primary key,
    clinic_id uuid references public.clinics(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete set null,
    action text not null, -- e.g. 'CREATE', 'UPDATE', 'DELETE'
    entity text not null, -- e.g. 'PATIENT', 'APPOINTMENT'
    entity_id text,
    details jsonb default '{}'::jsonb,
    created_at timestamptz default now() not null
);

-- Enable RLS
alter table public.audit_logs enable row level security;

-- Policies
create policy "Clinic members can insert audit logs"
    on public.audit_logs for insert
    with check (
        exists (
            select 1 from public.clinic_users
            where clinic_users.clinic_id = audit_logs.clinic_id
            and clinic_users.user_id = auth.uid()
        )
    );

create policy "Admins can view audit logs"
    on public.audit_logs for select
    using (
        exists (
            select 1 from public.clinic_users
            where clinic_users.clinic_id = audit_logs.clinic_id
            and clinic_users.user_id = auth.uid()
            and clinic_users.role = 'admin'
        )
    );

-- Index for faster queries
create index audit_logs_clinic_id_idx on public.audit_logs(clinic_id);
create index audit_logs_created_at_idx on public.audit_logs(created_at desc);
