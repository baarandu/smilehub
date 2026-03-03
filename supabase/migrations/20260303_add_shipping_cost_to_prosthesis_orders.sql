-- Add shipping_cost column to prosthesis_orders
ALTER TABLE prosthesis_orders
  ADD COLUMN IF NOT EXISTS shipping_cost numeric DEFAULT NULL;
