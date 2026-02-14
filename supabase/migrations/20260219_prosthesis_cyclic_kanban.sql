-- ============================================================================
-- Cyclic Kanban: 7 columns → 5 columns with unlimited lab ↔ clinic cycles
-- From: pre_lab → sent → in_lab → try_in → adjustment → installation → completed
-- To:   pre_lab → in_lab ⇄ in_clinic → installation → completed
-- ============================================================================

-- 1. Create prosthesis_shipments table
CREATE TABLE IF NOT EXISTS prosthesis_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES prosthesis_orders(id) ON DELETE CASCADE,
  shipment_number INTEGER NOT NULL,
  sent_to_lab_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  returned_to_clinic_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prosthesis_shipments_order_id ON prosthesis_shipments(order_id);

-- RLS policies (same pattern as prosthesis_orders)
ALTER TABLE prosthesis_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view shipments"
  ON prosthesis_shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prosthesis_orders po
      JOIN clinic_users cu ON cu.clinic_id = po.clinic_id
      WHERE po.id = prosthesis_shipments.order_id
        AND cu.user_id = auth.uid()
    )
  );

CREATE POLICY "Dentists can insert shipments"
  ON prosthesis_shipments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prosthesis_orders po
      JOIN clinic_users cu ON cu.clinic_id = po.clinic_id
      WHERE po.id = prosthesis_shipments.order_id
        AND cu.user_id = auth.uid()
        AND cu.role IN ('admin', 'dentist')
    )
  );

CREATE POLICY "Dentists can update shipments"
  ON prosthesis_shipments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM prosthesis_orders po
      JOIN clinic_users cu ON cu.clinic_id = po.clinic_id
      WHERE po.id = prosthesis_shipments.order_id
        AND cu.user_id = auth.uid()
        AND cu.role IN ('admin', 'dentist')
    )
  );

CREATE POLICY "Dentists can delete shipments"
  ON prosthesis_shipments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM prosthesis_orders po
      JOIN clinic_users cu ON cu.clinic_id = po.clinic_id
      WHERE po.id = prosthesis_shipments.order_id
        AND cu.user_id = auth.uid()
        AND cu.role IN ('admin', 'dentist')
    )
  );

-- 2. Add current_shipment_number to prosthesis_orders
ALTER TABLE prosthesis_orders
  ADD COLUMN IF NOT EXISTS current_shipment_number INTEGER DEFAULT 0;

-- 3. Migrate existing data (ORDER MATTERS)
-- 3a. in_lab → in_clinic (FIRST, before sent→in_lab overwrites)
UPDATE prosthesis_orders SET status = 'in_clinic' WHERE status = 'in_lab';

-- 3b. sent → in_lab
UPDATE prosthesis_orders SET status = 'in_lab' WHERE status = 'sent';

-- 3c. try_in → in_lab
UPDATE prosthesis_orders SET status = 'in_lab' WHERE status = 'try_in';

-- 3d. adjustment → in_lab
UPDATE prosthesis_orders SET status = 'in_lab' WHERE status = 'adjustment';

-- 3e. Backfill shipments from existing date columns
-- Orders that were sent at least once (have date_sent)
INSERT INTO prosthesis_shipments (order_id, shipment_number, sent_to_lab_at, returned_to_clinic_at, notes)
SELECT
  id,
  1,
  COALESCE(date_sent, created_at),
  date_received,
  'Migrado do sistema anterior'
FROM prosthesis_orders
WHERE date_sent IS NOT NULL;

-- Orders that had a second send (try_in date exists = came back and was re-sent)
INSERT INTO prosthesis_shipments (order_id, shipment_number, sent_to_lab_at, returned_to_clinic_at, notes)
SELECT
  id,
  2,
  COALESCE(date_try_in, created_at),
  date_adjustment,
  'Migrado do sistema anterior (2o envio)'
FROM prosthesis_orders
WHERE date_try_in IS NOT NULL;

-- Update current_shipment_number based on backfilled shipments
UPDATE prosthesis_orders po
SET current_shipment_number = COALESCE(
  (SELECT MAX(shipment_number) FROM prosthesis_shipments ps WHERE ps.order_id = po.id),
  0
);

-- 4. Update CHECK constraint for new status values
ALTER TABLE prosthesis_orders DROP CONSTRAINT IF EXISTS prosthesis_orders_status_check;
ALTER TABLE prosthesis_orders ADD CONSTRAINT prosthesis_orders_status_check
  CHECK (status IN ('pre_lab', 'in_lab', 'in_clinic', 'installation', 'completed'));
