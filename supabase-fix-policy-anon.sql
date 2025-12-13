-- Drop the restricted policy if it exists
drop policy if exists "Exams Access" on storage.objects;

-- Create a new policy that allows BOTH authenticated and anonymous users
create policy "Exams Access"
on storage.objects for all
to public
using ( bucket_id = 'exams' )
with check ( bucket_id = 'exams' );
