-- =====================================================
-- Migration: Prosthesis Center Tables
-- Created: 2026-02-17
-- Purpose: Create infrastructure for prosthesis tracking Kanban
-- =====================================================

-- =====================================================
-- PART 1: Tables
-- =====================================================

-- 1. Prosthesis Labs — Partner laboratories
CREATE TABLE IF NOT EXISTS prosthesis_labs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name text NOT NULL,
    phone text,
    email text,
    contact_person text,
    address text,
    notes text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Prosthesis Orders — Kanban cards
CREATE TABLE IF NOT EXISTS prosthesis_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    dentist_id uuid NOT NULL REFERENCES profiles(id),
    lab_id uuid REFERENCES prosthesis_labs(id) ON DELETE SET NULL,
    type text NOT NULL CHECK (type IN ('coroa', 'ponte', 'protese_total', 'protese_parcial', 'faceta', 'onlay', 'inlay', 'provisorio', 'nucleo', 'implante', 'outro')),
    material text CHECK (material IN ('zirconia', 'porcelana', 'resina', 'metal', 'emax', 'ceramica', 'acrilico', 'metalceramica', 'outro') OR material IS NULL),
    tooth_numbers text[] DEFAULT '{}',
    color text,
    shade_details text,
    cementation_type text,
    status text NOT NULL DEFAULT 'pre_lab' CHECK (status IN ('pre_lab', 'sent', 'in_lab', 'try_in', 'adjustment', 'installation', 'completed')),
    notes text,
    special_instructions text,
    lab_cost numeric(10,2),
    patient_price numeric(10,2),
    -- Checklist fields (all default false)
    checklist_color_defined boolean NOT NULL DEFAULT false,
    checklist_material_defined boolean NOT NULL DEFAULT false,
    checklist_cementation_defined boolean NOT NULL DEFAULT false,
    checklist_photos_attached boolean NOT NULL DEFAULT false,
    checklist_observations_added boolean NOT NULL DEFAULT false,
    -- Cycle dates
    date_ordered timestamptz DEFAULT now(),
    date_sent timestamptz,
    date_received timestamptz,
    date_try_in timestamptz,
    date_adjustment timestamptz,
    date_installation timestamptz,
    date_completed timestamptz,
    estimated_delivery_date date,
    position integer NOT NULL DEFAULT 0,
    created_by uuid REFERENCES profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. Prosthesis Order History — Audit trail (append-only)
CREATE TABLE IF NOT EXISTS prosthesis_order_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES prosthesis_orders(id) ON DELETE CASCADE,
    from_status text,
    to_status text NOT NULL,
    changed_by uuid REFERENCES profiles(id),
    notes text,
    created_at timestamptz DEFAULT now()
);

-- =====================================================
-- PART 2: Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_prosthesis_labs_clinic ON prosthesis_labs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_prosthesis_orders_clinic ON prosthesis_orders(clinic_id);
CREATE INDEX IF NOT EXISTS idx_prosthesis_orders_status ON prosthesis_orders(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_prosthesis_orders_patient ON prosthesis_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_prosthesis_orders_dentist ON prosthesis_orders(dentist_id);
CREATE INDEX IF NOT EXISTS idx_prosthesis_orders_lab ON prosthesis_orders(lab_id);
CREATE INDEX IF NOT EXISTS idx_prosthesis_orders_position ON prosthesis_orders(clinic_id, status, position);
CREATE INDEX IF NOT EXISTS idx_prosthesis_history_order ON prosthesis_order_history(order_id);

-- =====================================================
-- PART 3: Updated At Triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_prosthesis_labs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_prosthesis_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prosthesis_labs_updated_at
    BEFORE UPDATE ON prosthesis_labs
    FOR EACH ROW
    EXECUTE FUNCTION update_prosthesis_labs_updated_at();

CREATE TRIGGER trg_prosthesis_orders_updated_at
    BEFORE UPDATE ON prosthesis_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_prosthesis_orders_updated_at();

-- =====================================================
-- PART 4: Row Level Security (RLS)
-- =====================================================

ALTER TABLE prosthesis_labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE prosthesis_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE prosthesis_order_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Clinic members can view labs" ON prosthesis_labs;
DROP POLICY IF EXISTS "Dentists can create labs" ON prosthesis_labs;
DROP POLICY IF EXISTS "Dentists can update labs" ON prosthesis_labs;
DROP POLICY IF EXISTS "Dentists can delete labs" ON prosthesis_labs;
DROP POLICY IF EXISTS "Clinic members can view orders" ON prosthesis_orders;
DROP POLICY IF EXISTS "Dentists can create orders" ON prosthesis_orders;
DROP POLICY IF EXISTS "Dentists can update orders" ON prosthesis_orders;
DROP POLICY IF EXISTS "Dentists can delete orders" ON prosthesis_orders;
DROP POLICY IF EXISTS "Clinic members can view order history" ON prosthesis_order_history;
DROP POLICY IF EXISTS "Dentists can create order history" ON prosthesis_order_history;

-- Prosthesis Labs RLS
CREATE POLICY "Clinic members can view labs"
    ON prosthesis_labs FOR SELECT
    USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Dentists can create labs"
    ON prosthesis_labs FOR INSERT
    WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
        )
    );

CREATE POLICY "Dentists can update labs"
    ON prosthesis_labs FOR UPDATE
    USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
        )
    );

CREATE POLICY "Dentists can delete labs"
    ON prosthesis_labs FOR DELETE
    USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
        )
    );

-- Prosthesis Orders RLS
CREATE POLICY "Clinic members can view orders"
    ON prosthesis_orders FOR SELECT
    USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Dentists can create orders"
    ON prosthesis_orders FOR INSERT
    WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
        )
    );

CREATE POLICY "Dentists can update orders"
    ON prosthesis_orders FOR UPDATE
    USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
        )
    );

CREATE POLICY "Dentists can delete orders"
    ON prosthesis_orders FOR DELETE
    USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users
            WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
        )
    );

-- Prosthesis Order History RLS
CREATE POLICY "Clinic members can view order history"
    ON prosthesis_order_history FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM prosthesis_orders
            WHERE clinic_id IN (
                SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Dentists can create order history"
    ON prosthesis_order_history FOR INSERT
    WITH CHECK (
        order_id IN (
            SELECT id FROM prosthesis_orders
            WHERE clinic_id IN (
                SELECT clinic_id FROM clinic_users
                WHERE user_id = auth.uid() AND role IN ('admin', 'dentist')
            )
        )
    );
