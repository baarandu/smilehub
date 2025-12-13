-- Add date column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'exams' and column_name = 'date') then
    alter table public.exams add column date date;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'exams' and column_name = 'title') then
    alter table public.exams add column title text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'exams' and column_name = 'description') then
    alter table public.exams add column description text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'exams' and column_name = 'file_urls') then
    alter table public.exams add column file_urls text[] default '{}';
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'exams' and column_name = 'procedure_id') then
    alter table public.exams add column procedure_id uuid references public.procedures(id);
  end if;
  
  if not exists (select 1 from information_schema.columns where table_name = 'exams' and column_name = 'type') then
    alter table public.exams add column type text default 'image';
  end if;
end $$;

-- Update existing rows to have default values if needed
update public.exams set date = created_at::date where date is null;
update public.exams set title = 'Exame' where title is null;

-- Make columns not null after populating
alter table public.exams alter column date set not null;
alter table public.exams alter column title set not null;
