-- Receita sem local: quando a clínica tem UM único local cadastrado, novas
-- receitas passam a ser carimbadas com ele automaticamente. Pedido do caso
-- Clínica Essência (2026-07-10): só existe um local de atendimento, mas a
-- maioria dos lançamentos (pagamentos de orçamento etc.) não passa pelo campo
-- de local e caía em "Sem local definido" no card Receita por Local.
-- Clínicas com 2+ locais não são afetadas — aí a escolha precisa ser manual.
create or replace function public.default_income_location()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  single_location text;
begin
  if new.type = 'income' and new.location is null and new.clinic_id is not null then
    select min(name) into single_location
    from locations
    where clinic_id = new.clinic_id
    having count(*) = 1;
    if single_location is not null then
      new.location := single_location;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_default_income_location on financial_transactions;
create trigger trg_default_income_location
  before insert on financial_transactions
  for each row execute function default_income_location();
