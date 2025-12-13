-- Create financial_transactions table
create table if not exists public.financial_transactions (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('income', 'expense')),
  amount numeric not null,
  description text not null,
  category text not null,
  date date not null,
  location text,
  patient_id uuid references public.patients(id),
  related_entity_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.financial_transactions enable row level security;

-- Create policies
create policy "Enable read access for authenticated users"
on public.financial_transactions for select
to authenticated
using (true);

create policy "Enable insert access for authenticated users"
on public.financial_transactions for insert
to authenticated
with check (true);

create policy "Enable update access for authenticated users"
on public.financial_transactions for update
to authenticated
using (true);

create policy "Enable delete access for authenticated users"
on public.financial_transactions for delete
to authenticated
using (true);

-- Create trigger for updated_at (assuming handle_updated_at exists, if not we create it first)
-- Safety check for the function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Drop trigger if exists to avoid conflicts
DROP TRIGGER IF EXISTS handle_financial_transactions_updated_at ON public.financial_transactions;

CREATE TRIGGER handle_financial_transactions_updated_at
BEFORE UPDATE ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
