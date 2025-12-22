-- Create alert_dismissals table to track handled/dismissed alerts
CREATE TABLE IF NOT EXISTS alert_dismissals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('birthday', 'procedure_return')),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    alert_date DATE NOT NULL, -- Birthday date or last procedure date
    dismissed_at TIMESTAMPTZ DEFAULT NOW(),
    action_taken VARCHAR(50) CHECK (action_taken IN ('messaged', 'scheduled', 'dismissed')),
    UNIQUE(user_id, alert_type, patient_id, alert_date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_alert_dismissals_user ON alert_dismissals(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_dismissals_lookup ON alert_dismissals(user_id, alert_type, patient_id, alert_date);

-- Enable RLS
ALTER TABLE alert_dismissals ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see/manage their own dismissals
DROP POLICY IF EXISTS "Users can view own dismissals" ON alert_dismissals;
CREATE POLICY "Users can view own dismissals" ON alert_dismissals
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own dismissals" ON alert_dismissals;
CREATE POLICY "Users can insert own dismissals" ON alert_dismissals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own dismissals" ON alert_dismissals;
CREATE POLICY "Users can delete own dismissals" ON alert_dismissals
    FOR DELETE USING (auth.uid() = user_id);
