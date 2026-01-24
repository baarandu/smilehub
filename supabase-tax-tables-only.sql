-- Minimal SQL to create tax rate tables
-- Run this in Supabase SQL Editor

-- Table: tax_rate_configurations
CREATE TABLE IF NOT EXISTS tax_rate_configurations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    tax_regime TEXT NOT NULL CHECK (tax_regime IN ('pf_carne_leao', 'simples', 'lucro_presumido', 'lucro_real')),
    tax_type TEXT NOT NULL,
    rate_type TEXT NOT NULL CHECK (rate_type IN ('flat', 'progressive')),
    flat_rate NUMERIC(6,4),
    presumption_rate NUMERIC(6,4),
    description TEXT,
    effective_from DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, tax_regime, tax_type, effective_from)
);

-- Table: tax_rate_brackets
CREATE TABLE IF NOT EXISTS tax_rate_brackets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tax_configuration_id UUID REFERENCES tax_rate_configurations(id) ON DELETE CASCADE NOT NULL,
    min_value NUMERIC(15,2) NOT NULL,
    max_value NUMERIC(15,2),
    rate NUMERIC(6,4) NOT NULL,
    deduction NUMERIC(15,2) DEFAULT 0,
    bracket_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tax_configuration_id, bracket_order)
);

-- Table: iss_municipal_rates
CREATE TABLE IF NOT EXISTS iss_municipal_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    rate NUMERIC(6,4) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, city, state)
);

-- RLS Policies
ALTER TABLE tax_rate_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rate_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE iss_municipal_rates ENABLE ROW LEVEL SECURITY;

-- Policies for tax_rate_configurations
CREATE POLICY "Users can view their clinic tax configurations"
    ON tax_rate_configurations FOR SELECT
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their clinic tax configurations"
    ON tax_rate_configurations FOR INSERT
    WITH CHECK (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their clinic tax configurations"
    ON tax_rate_configurations FOR UPDATE
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their clinic tax configurations"
    ON tax_rate_configurations FOR DELETE
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

-- Policies for tax_rate_brackets
CREATE POLICY "Users can view their clinic tax brackets"
    ON tax_rate_brackets FOR SELECT
    USING (tax_configuration_id IN (
        SELECT id FROM tax_rate_configurations WHERE clinic_id IN (
            SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Users can insert their clinic tax brackets"
    ON tax_rate_brackets FOR INSERT
    WITH CHECK (tax_configuration_id IN (
        SELECT id FROM tax_rate_configurations WHERE clinic_id IN (
            SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Users can update their clinic tax brackets"
    ON tax_rate_brackets FOR UPDATE
    USING (tax_configuration_id IN (
        SELECT id FROM tax_rate_configurations WHERE clinic_id IN (
            SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "Users can delete their clinic tax brackets"
    ON tax_rate_brackets FOR DELETE
    USING (tax_configuration_id IN (
        SELECT id FROM tax_rate_configurations WHERE clinic_id IN (
            SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
        )
    ));

-- Policies for iss_municipal_rates
CREATE POLICY "Users can view their clinic ISS rates"
    ON iss_municipal_rates FOR SELECT
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their clinic ISS rates"
    ON iss_municipal_rates FOR INSERT
    WITH CHECK (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their clinic ISS rates"
    ON iss_municipal_rates FOR UPDATE
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their clinic ISS rates"
    ON iss_municipal_rates FOR DELETE
    USING (clinic_id IN (SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()));
