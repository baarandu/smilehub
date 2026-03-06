-- Split Payments & Scheduled Receivables
-- Allows patients to split payments across methods and schedule future installments

-- Table: payment_receivables
CREATE TABLE IF NOT EXISTS payment_receivables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,

    -- Split grouping
    split_group_id UUID NOT NULL,
    split_index INTEGER NOT NULL DEFAULT 0,

    -- Payment details
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL,
    installments INTEGER NOT NULL DEFAULT 1,
    brand TEXT,

    -- Scheduling
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'overdue', 'cancelled')),
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES auth.users(id),

    -- Link to financial_transactions when confirmed
    financial_transaction_id UUID,

    -- Budget item reference
    tooth_index INTEGER NOT NULL,
    tooth_description TEXT NOT NULL,

    -- Pre-calculated deductions
    tax_rate NUMERIC(6,4) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    card_fee_rate NUMERIC(6,4) DEFAULT 0,
    card_fee_amount NUMERIC(12,2) DEFAULT 0,
    anticipation_rate NUMERIC(6,4) DEFAULT 0,
    anticipation_amount NUMERIC(12,2) DEFAULT 0,
    location_rate NUMERIC(6,4) DEFAULT 0,
    location_amount NUMERIC(12,2) DEFAULT 0,
    net_amount NUMERIC(12,2) DEFAULT 0,

    -- Payer
    payer_is_patient BOOLEAN DEFAULT true,
    payer_type TEXT DEFAULT 'PF',
    payer_name TEXT,
    payer_cpf TEXT,
    pj_source_id UUID,

    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_receivables_clinic ON payment_receivables(clinic_id);
CREATE INDEX idx_receivables_patient ON payment_receivables(patient_id);
CREATE INDEX idx_receivables_budget ON payment_receivables(budget_id);
CREATE INDEX idx_receivables_status ON payment_receivables(status);
CREATE INDEX idx_receivables_due_date ON payment_receivables(due_date);
CREATE INDEX idx_receivables_split_group ON payment_receivables(split_group_id);
CREATE INDEX idx_receivables_active ON payment_receivables(clinic_id, status, due_date)
    WHERE status IN ('pending', 'overdue');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_receivables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_receivables_updated_at
    BEFORE UPDATE ON payment_receivables
    FOR EACH ROW
    EXECUTE FUNCTION update_receivables_updated_at();

-- RLS
ALTER TABLE payment_receivables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "receivables_select" ON payment_receivables
    FOR SELECT USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "receivables_insert" ON payment_receivables
    FOR INSERT WITH CHECK (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "receivables_update" ON payment_receivables
    FOR UPDATE USING (
        clinic_id IN (
            SELECT clinic_id FROM clinic_users WHERE user_id = auth.uid()
        )
    );

-- RPC: Mark overdue receivables (called by pg_cron daily at 6am)
CREATE OR REPLACE FUNCTION mark_overdue_receivables()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE payment_receivables
    SET status = 'overdue', updated_at = now()
    WHERE status = 'pending'
      AND due_date < CURRENT_DATE;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

-- RPC: Get overdue summary for a clinic
CREATE OR REPLACE FUNCTION get_overdue_summary(p_clinic_id UUID)
RETURNS TABLE(total_count BIGINT, total_amount NUMERIC, patients_count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_count,
        COALESCE(SUM(amount), 0)::NUMERIC AS total_amount,
        COUNT(DISTINCT patient_id)::BIGINT AS patients_count
    FROM payment_receivables
    WHERE clinic_id = p_clinic_id
      AND status = 'overdue';
END;
$$;

-- RPC: Get receivables for a patient
CREATE OR REPLACE FUNCTION get_patient_receivables(p_patient_id UUID)
RETURNS SETOF payment_receivables
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM payment_receivables
    WHERE patient_id = p_patient_id
      AND status IN ('pending', 'overdue')
    ORDER BY due_date ASC;
END;
$$;

-- RPC: Get receivables due today for a clinic
CREATE OR REPLACE FUNCTION get_receivables_due_today(p_clinic_id UUID)
RETURNS SETOF payment_receivables
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM payment_receivables
    WHERE clinic_id = p_clinic_id
      AND due_date = CURRENT_DATE
      AND status IN ('pending', 'overdue');
END;
$$;

-- Schedule pg_cron job (runs daily at 6am BRT = 9am UTC)
-- NOTE: This requires pg_cron extension enabled on the Supabase project
-- SELECT cron.schedule('mark-overdue-receivables', '0 9 * * *', 'SELECT mark_overdue_receivables()');
