-- Migration: Remove 'installation' status from prosthesis Kanban
-- Flow becomes: pre_lab -> in_lab <-> in_clinic -> completed

-- 1. Move any orders with 'installation' status back to 'in_clinic'
UPDATE prosthesis_orders
SET status = 'in_clinic', updated_at = now()
WHERE status = 'installation';

-- 2. Drop existing CHECK constraint and add new one without 'installation'
ALTER TABLE prosthesis_orders
  DROP CONSTRAINT IF EXISTS prosthesis_orders_status_check;

ALTER TABLE prosthesis_orders
  ADD CONSTRAINT prosthesis_orders_status_check
  CHECK (status IN ('pre_lab', 'in_lab', 'in_clinic', 'completed'));
