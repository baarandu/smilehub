-- Add ON DELETE CASCADE to patient foreign keys
-- This ensures that when a patient is deleted, all their related data is also deleted

-- Financial Transactions
ALTER TABLE IF EXISTS public.financial_transactions
    DROP CONSTRAINT IF EXISTS financial_transactions_patient_id_fkey,
    ADD CONSTRAINT financial_transactions_patient_id_fkey
    FOREIGN KEY (patient_id)
    REFERENCES public.patients(id)
    ON DELETE CASCADE;

-- Appointments
ALTER TABLE IF EXISTS public.appointments
    DROP CONSTRAINT IF EXISTS appointments_patient_id_fkey,
    ADD CONSTRAINT appointments_patient_id_fkey
    FOREIGN KEY (patient_id)
    REFERENCES public.patients(id)
    ON DELETE CASCADE;

-- Procedures
ALTER TABLE IF EXISTS public.procedures
    DROP CONSTRAINT IF EXISTS procedures_patient_id_fkey,
    ADD CONSTRAINT procedures_patient_id_fkey
    FOREIGN KEY (patient_id)
    REFERENCES public.patients(id)
    ON DELETE CASCADE;

-- Exams
ALTER TABLE IF EXISTS public.exams
    DROP CONSTRAINT IF EXISTS exams_patient_id_fkey,
    ADD CONSTRAINT exams_patient_id_fkey
    FOREIGN KEY (patient_id)
    REFERENCES public.patients(id)
    ON DELETE CASCADE;

-- Anamneses
ALTER TABLE IF EXISTS public.anamneses
    DROP CONSTRAINT IF EXISTS anamneses_patient_id_fkey,
    ADD CONSTRAINT anamneses_patient_id_fkey
    FOREIGN KEY (patient_id)
    REFERENCES public.patients(id)
    ON DELETE CASCADE;

-- Budgets
ALTER TABLE IF EXISTS public.budgets
    DROP CONSTRAINT IF EXISTS budgets_patient_id_fkey,
    ADD CONSTRAINT budgets_patient_id_fkey
    FOREIGN KEY (patient_id)
    REFERENCES public.patients(id)
    ON DELETE CASCADE;

-- Consultations
ALTER TABLE IF EXISTS public.consultations
    DROP CONSTRAINT IF EXISTS consultations_patient_id_fkey,
    ADD CONSTRAINT consultations_patient_id_fkey
    FOREIGN KEY (patient_id)
    REFERENCES public.patients(id)
    ON DELETE CASCADE;
