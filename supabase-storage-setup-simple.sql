-- Create the exams bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('exams', 'exams', true)
on conflict (id) do nothing;

-- 1. Try to drop policies individually. If it fails, you can skip to "CREATE POLICY" section.
-- It is safe to ignore errors here if policies don't exist.
drop policy if exists "Exams Insert Access" on storage.objects;
drop policy if exists "Exams Select Access" on storage.objects;
drop policy if exists "Exams Update Access" on storage.objects;
drop policy if exists "Exams Delete Access" on storage.objects;
drop policy if exists "Exams Access" on storage.objects;

-- 2. Create policies for the 'exams' bucket
create policy "Exams Access"
on storage.objects for all
to authenticated
using ( bucket_id = 'exams' )
with check ( bucket_id = 'exams' );
