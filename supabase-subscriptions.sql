-- Create subscription status enum
create extension if not exists moddatetime schema extensions;
create type subscription_status as enum ('active', 'past_due', 'canceled', 'trialing');

-- Create subscriptions table
create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  clinic_id uuid references public.clinics(id) on delete cascade not null,
  plan_id uuid references public.subscription_plans(id) on delete restrict not null,
  status subscription_status not null default 'active',
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.subscriptions enable row level security;

-- Policies

-- Clinic users can view their own subscription
create policy "Users can view subscription for their clinic"
  on public.subscriptions for select
  using (
    exists (
      select 1 from public.clinic_users
      where clinic_users.clinic_id = subscriptions.clinic_id
      and clinic_users.user_id = auth.uid()
    )
  );

-- Only super admins can insert/update/delete subscriptions (for manual management initially)
create policy "Super admins can manage subscriptions"
  on public.subscriptions for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.is_super_admin = true
    )
  );

-- Helper trigger to update updated_at
create trigger handle_updated_at before update on public.subscriptions
  for each row execute procedure moddatetime (updated_at);
