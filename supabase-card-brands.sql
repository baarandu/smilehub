-- =====================================================
-- Card Brands Table for Custom Brand Management
-- Execute this in Supabase SQL Editor
-- =====================================================

-- Create card_brands table
CREATE TABLE IF NOT EXISTS card_brands (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name text NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

-- Create unique constraint for brand name per clinic
CREATE UNIQUE INDEX IF NOT EXISTS idx_card_brands_unique 
ON card_brands(clinic_id, LOWER(name));

-- Enable RLS
ALTER TABLE card_brands ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Select card_brands" ON card_brands
    FOR SELECT TO authenticated
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

CREATE POLICY "Insert card_brands" ON card_brands
    FOR INSERT TO authenticated
    WITH CHECK (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

CREATE POLICY "Delete card_brands" ON card_brands
    FOR DELETE TO authenticated
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

-- Insert default brands for existing clinics
INSERT INTO card_brands (clinic_id, name, is_default)
SELECT c.id, brand.name, true
FROM clinics c
CROSS JOIN (
    VALUES ('Visa'), ('Mastercard'), ('Elo'), ('Amex'), ('Hipercard'), ('Outras Bandeiras')
) AS brand(name)
ON CONFLICT DO NOTHING;

-- Function to create default brands for new clinics
CREATE OR REPLACE FUNCTION create_default_card_brands()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO card_brands (clinic_id, name, is_default)
    VALUES 
        (NEW.id, 'Visa', true),
        (NEW.id, 'Mastercard', true),
        (NEW.id, 'Elo', true),
        (NEW.id, 'Amex', true),
        (NEW.id, 'Hipercard', true),
        (NEW.id, 'Outras Bandeiras', true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new clinics
DROP TRIGGER IF EXISTS trigger_create_default_card_brands ON clinics;
CREATE TRIGGER trigger_create_default_card_brands
    AFTER INSERT ON clinics
    FOR EACH ROW
    EXECUTE FUNCTION create_default_card_brands();
