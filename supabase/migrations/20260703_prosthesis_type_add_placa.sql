-- Extend the prosthesis_orders.type CHECK constraint to include the lab treatment
-- types that the budget already maps to but were missing from the original constraint:
-- 'placa' (Placa Miorrelaxante), 'pino' (Pino) and 'protese_removivel' (Prótese Removível).
ALTER TABLE prosthesis_orders
  DROP CONSTRAINT IF EXISTS prosthesis_orders_type_check;

ALTER TABLE prosthesis_orders
  ADD CONSTRAINT prosthesis_orders_type_check
  CHECK (type IN (
    'coroa', 'ponte', 'protese_total', 'protese_parcial', 'protese_removivel',
    'faceta', 'onlay', 'inlay', 'pino', 'provisorio', 'placa', 'nucleo',
    'implante', 'outro'
  ));
