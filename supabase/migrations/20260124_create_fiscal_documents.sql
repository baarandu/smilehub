-- Fiscal Documents table for income tax and accounting documentation
create table if not exists public.fiscal_documents (
    id uuid default gen_random_uuid() primary key,
    clinic_id uuid references public.clinics(id) on delete cascade not null,

    -- File metadata
    name text not null,
    description text,
    file_url text not null,
    file_type text not null default 'document', -- 'image', 'pdf', 'document'
    file_size integer not null default 0,

    -- Tax regime categorization
    tax_regime text not null, -- 'pf', 'simples', 'lucro_presumido', 'lucro_real', 'all'

    -- Document categorization
    category text not null, -- Main category
    subcategory text, -- Specific subcategory

    -- Reference period
    fiscal_year integer not null,
    reference_month integer, -- 1-12 for monthly docs, null for annual

    -- Metadata
    uploaded_by uuid references public.profiles(id) on delete set null,
    notes text,

    -- Timestamps
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.fiscal_documents enable row level security;

-- Policies
create policy "Clinic members can view fiscal documents"
    on public.fiscal_documents for select
    using (
        exists (
            select 1 from public.clinic_users
            where clinic_users.clinic_id = fiscal_documents.clinic_id
            and clinic_users.user_id = auth.uid()
        )
    );

create policy "Clinic members can insert fiscal documents"
    on public.fiscal_documents for insert
    with check (
        exists (
            select 1 from public.clinic_users
            where clinic_users.clinic_id = fiscal_documents.clinic_id
            and clinic_users.user_id = auth.uid()
        )
    );

create policy "Clinic members can update fiscal documents"
    on public.fiscal_documents for update
    using (
        exists (
            select 1 from public.clinic_users
            where clinic_users.clinic_id = fiscal_documents.clinic_id
            and clinic_users.user_id = auth.uid()
        )
    );

create policy "Clinic members can delete fiscal documents"
    on public.fiscal_documents for delete
    using (
        exists (
            select 1 from public.clinic_users
            where clinic_users.clinic_id = fiscal_documents.clinic_id
            and clinic_users.user_id = auth.uid()
        )
    );

-- Indexes for faster queries
create index fiscal_documents_clinic_id_idx on public.fiscal_documents(clinic_id);
create index fiscal_documents_fiscal_year_idx on public.fiscal_documents(fiscal_year);
create index fiscal_documents_tax_regime_idx on public.fiscal_documents(tax_regime);
create index fiscal_documents_category_idx on public.fiscal_documents(category);

-- Update trigger for updated_at
create or replace function update_fiscal_documents_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger fiscal_documents_updated_at
    before update on public.fiscal_documents
    for each row
    execute function update_fiscal_documents_updated_at();

-- Comments for documentation
comment on table public.fiscal_documents is 'Stores fiscal and tax-related documents organized by regime and category';
comment on column public.fiscal_documents.tax_regime is 'Tax regime: pf (pessoa fisica), simples, lucro_presumido, lucro_real, or all';
comment on column public.fiscal_documents.category is 'Main category: identificacao, rendimentos, despesas, folha_pagamento, impostos, bens_direitos, dividas, dependentes, especificos';
comment on column public.fiscal_documents.subcategory is 'Specific subcategory within the main category';
comment on column public.fiscal_documents.fiscal_year is 'The fiscal year this document refers to';
comment on column public.fiscal_documents.reference_month is 'Month 1-12 for monthly documents, null for annual documents';
