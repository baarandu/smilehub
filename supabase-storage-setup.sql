-- Create the exams bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('exams', 'exams', true)
on conflict (id) do nothing;

-- Enable RLS on objects (it usually is enabled by default, but good to ensure)
alter table storage.objects enable row level security;

-- Drop existing policies to avoid conflicts if they exist with different names or same logic
drop policy if exists "Exams Public Access" on storage.objects;
drop policy if exists "Exams Upload Access" on storage.objects;
drop policy if exists "Exams Update Access" on storage.objects;
drop policy if exists "Exams Delete Access" on storage.objects;
drop policy if exists "Give users access to own folder 1qoi23_0" on storage.objects;
drop policy if exists "Give users access to own folder 1qoi23_1" on storage.objects;
drop policy if exists "Give users access to own folder 1qoi23_2" on storage.objects;

-- Create ALL permissions for authenticated users on the 'exams' bucket
create policy "Exams Insert Access"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'exams' );

create policy "Exams Select Access"
on storage.objects for select
to authenticated
using ( bucket_id = 'exams' );

create policy "Exams Update Access"
on storage.objects for update
to authenticated
using ( bucket_id = 'exams' );

create policy "Exams Delete Access"
on storage.objects for delete
to authenticated
using ( bucket_id = 'exams' );
