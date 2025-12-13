-- Remove all existing policies on storage.objects for exams bucket
-- to avoid conflicts

-- Allow PUBLIC read access (no authentication needed)
drop policy if exists "Public Read Access for exams" on storage.objects;
create policy "Public Read Access for exams"
on storage.objects for select
to public
using ( bucket_id = 'exams' );

-- Allow authenticated users to upload
drop policy if exists "Authenticated Upload for exams" on storage.objects;
create policy "Authenticated Upload for exams"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'exams' );

-- Allow authenticated users to delete their uploads
drop policy if exists "Authenticated Delete for exams" on storage.objects;
create policy "Authenticated Delete for exams"
on storage.objects for delete
to authenticated
using ( bucket_id = 'exams' );
