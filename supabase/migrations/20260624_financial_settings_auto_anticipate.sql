-- Adiciona a opção "antecipar automaticamente" nas configurações financeiras.
-- Quando ativada, todo pagamento no cartão de crédito já entra antecipado
-- (lançado de uma vez no mês do registro) sem precisar marcar o toggle
-- "Antecipar Recebimento" a cada pagamento. Quando desativada (padrão), o
-- pagamento no crédito é parcelado nos meses seguintes conforme o número de
-- parcelas, a menos que o profissional marque a antecipação manualmente.

ALTER TABLE public.financial_settings
  ADD COLUMN IF NOT EXISTS auto_anticipate boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.financial_settings.auto_anticipate IS
  'Quando true, pagamentos no cartão de crédito são antecipados automaticamente (lançados de uma vez no mês do registro) sem precisar marcar o toggle a cada pagamento.';
