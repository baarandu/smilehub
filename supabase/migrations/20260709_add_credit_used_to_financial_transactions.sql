-- Registra quanto do valor do procedimento foi abatido do crédito do paciente
-- nesta transação. O dinheiro do crédito entra no Financeiro quando o crédito
-- é criado (AddCreditDialog); no consumo apenas exibimos o abatimento.
alter table financial_transactions
  add column if not exists credit_used numeric not null default 0;
