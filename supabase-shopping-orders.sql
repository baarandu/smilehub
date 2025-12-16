-- =====================================================
-- Shopping Orders Table for Materials History
-- Execute this in Supabase SQL Editor
-- =====================================================

-- Create shopping_orders table
CREATE TABLE IF NOT EXISTS shopping_orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    items jsonb NOT NULL DEFAULT '[]',
    total_amount numeric(12,2) NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE shopping_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Select shopping_orders" ON shopping_orders
    FOR SELECT TO authenticated
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

CREATE POLICY "Insert shopping_orders" ON shopping_orders
    FOR INSERT TO authenticated
    WITH CHECK (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

CREATE POLICY "Update shopping_orders" ON shopping_orders
    FOR UPDATE TO authenticated
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

CREATE POLICY "Delete shopping_orders" ON shopping_orders
    FOR DELETE TO authenticated
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_shopping_orders_clinic_status 
ON shopping_orders(clinic_id, status, created_at DESC);
