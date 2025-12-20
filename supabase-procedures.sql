-- Create procedures table
CREATE TABLE IF NOT EXISTS procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    location VARCHAR(255),
    description TEXT,
    value DECIMAL(10, 2),
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'debit', 'credit')),
    installments INTEGER DEFAULT 1 CHECK (installments >= 1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_procedures_patient_id ON procedures(patient_id);
CREATE INDEX IF NOT EXISTS idx_procedures_date ON procedures(date);

-- Enable RLS
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view procedures" ON procedures;
CREATE POLICY "Users can view procedures" ON procedures
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert procedures" ON procedures;
CREATE POLICY "Users can insert procedures" ON procedures
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update procedures" ON procedures;
CREATE POLICY "Users can update procedures" ON procedures
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete procedures" ON procedures;
CREATE POLICY "Users can delete procedures" ON procedures
    FOR DELETE USING (true);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS procedures_updated_at ON procedures;
CREATE TRIGGER procedures_updated_at
    BEFORE UPDATE ON procedures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();




