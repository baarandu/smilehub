-- Create storage bucket for fiscal documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'fiscal-documents',
    'fiscal-documents',
    true,
    20971520, -- 20MB limit
    array[
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/heic',
        'image/heif',
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/xml',
        'application/xml'
    ]
)
on conflict (id) do nothing;

-- Storage policies for fiscal documents bucket
create policy "Clinic members can upload fiscal documents"
    on storage.objects for insert
    with check (
        bucket_id = 'fiscal-documents' and
        (storage.foldername(name))[1] in (
            select cu.clinic_id::text
            from public.clinic_users cu
            where cu.user_id = auth.uid()
        )
    );

create policy "Clinic members can view fiscal documents"
    on storage.objects for select
    using (
        bucket_id = 'fiscal-documents' and
        (storage.foldername(name))[1] in (
            select cu.clinic_id::text
            from public.clinic_users cu
            where cu.user_id = auth.uid()
        )
    );

create policy "Clinic members can delete fiscal documents"
    on storage.objects for delete
    using (
        bucket_id = 'fiscal-documents' and
        (storage.foldername(name))[1] in (
            select cu.clinic_id::text
            from public.clinic_users cu
            where cu.user_id = auth.uid()
        )
    );
