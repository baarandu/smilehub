-- Add expiration date and reminder fields to fiscal_documents
ALTER TABLE public.fiscal_documents
ADD COLUMN IF NOT EXISTS expiration_date DATE,
ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER DEFAULT 30;

-- Create fiscal_document_reminders table for recurring document deadlines
CREATE TABLE IF NOT EXISTS public.fiscal_document_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE NOT NULL,
    tax_regime TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'once', -- once, monthly, quarterly, annually
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add RLS policies
ALTER TABLE public.fiscal_document_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members can view fiscal reminders"
    ON public.fiscal_document_reminders FOR SELECT
    USING (
        clinic_id IN (
            SELECT cu.clinic_id FROM public.clinic_users cu WHERE cu.user_id = auth.uid()
        )
    );

CREATE POLICY "Clinic members can manage fiscal reminders"
    ON public.fiscal_document_reminders FOR ALL
    USING (
        clinic_id IN (
            SELECT cu.clinic_id FROM public.clinic_users cu WHERE cu.user_id = auth.uid()
        )
    );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_expiration ON public.fiscal_documents(expiration_date);
CREATE INDEX IF NOT EXISTS idx_fiscal_reminders_clinic ON public.fiscal_document_reminders(clinic_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_reminders_due_date ON public.fiscal_document_reminders(due_date);

-- Insert default reminders for common annual documents
-- These will be created per-clinic when they first access the feature
