-- Create exams table
create table if not exists public.exams (
  id uuid default gen_random_uuid() primary key,
  patient_id uuid references public.patients(id) not null,
  procedure_id uuid references public.procedures(id),
  title text not null,
  name text not null,
  date date not null,
  order_date date not null,
  description text,
  file_urls text[] not null default '{}',
  type text not null default 'image',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.exams enable row level security;

-- Create policies
create policy "Enable read access for authenticated users"
on public.exams for select
to authenticated
using (true);

create policy "Enable insert access for authenticated users"
on public.exams for insert
to authenticated
with check (true);

create policy "Enable update access for authenticated users"
on public.exams for update
to authenticated
using (true);

create policy "Enable delete access for authenticated users"
on public.exams for delete
to authenticated
using (true);

-- Create storage bucket for exams if not exists
insert into storage.buckets (id, name, public)
values ('exams', 'exams', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Give users access to own folder 1qoi23_0"
on storage.objects for select
to authenticated
using (bucket_id = 'exams');

create policy "Give users access to own folder 1qoi23_1"
on storage.objects for insert
to authenticated
with check (bucket_id = 'exams');

create policy "Give users access to own folder 1qoi23_2"
on storage.objects for delete
to authenticated
using (bucket_id = 'exams');

-- Trigger for updated_at
CREATE TRIGGER handle_exams_updated_at
BEFORE UPDATE ON public.exams
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
