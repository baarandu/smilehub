-- Add invoice_url column to shopping_orders for storing fiscal document references
ALTER TABLE shopping_orders ADD COLUMN IF NOT EXISTS invoice_url text;
