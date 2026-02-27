-- Create exams storage bucket (if not exists)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'exams',
    'exams',
    true,
    20971520, -- 20MB
    array[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/heic',
        'image/heif',
        'application/pdf'
    ]
)
on conflict (id) do nothing;

-- Storage policy: clinic members can upload exams
create policy "Clinic members can upload exams"
    on storage.objects for insert
    with check (
        bucket_id = 'exams' and
        (storage.foldername(name))[1] in (
            select cu.clinic_id::text
            from public.clinic_users cu
            where cu.user_id = auth.uid()
        )
    );

-- Storage policy: clinic members can view exams
create policy "Clinic members can view exams"
    on storage.objects for select
    using (
        bucket_id = 'exams' and
        (storage.foldername(name))[1] in (
            select cu.clinic_id::text
            from public.clinic_users cu
            where cu.user_id = auth.uid()
        )
    );

-- Storage policy: clinic members can delete exams
create policy "Clinic members can delete exams"
    on storage.objects for delete
    using (
        bucket_id = 'exams' and
        (storage.foldername(name))[1] in (
            select cu.clinic_id::text
            from public.clinic_users cu
            where cu.user_id = auth.uid()
        )
    );
