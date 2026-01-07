-- Allow admins, managers, and dentists to delete patients within their clinic
-- Fixes error 42710 by dropping strict policy if it exists to replace with inclusive one
DROP POLICY IF EXISTS "Users can delete patients in their clinic" ON public.patients;

CREATE POLICY "Users can delete patients in their clinic" ON public.patients
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.clinic_users cu
            WHERE cu.user_id = auth.uid()
            AND cu.clinic_id = patients.clinic_id
            AND cu.role IN ('admin', 'manager', 'dentist')
        )
    );
