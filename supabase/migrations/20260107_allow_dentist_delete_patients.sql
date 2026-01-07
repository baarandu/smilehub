-- Allow admins, managers, and dentists to delete patients within their clinic
-- This fixes the issue where dentists could not delete their own patients
CREATE POLICY "Users can delete patients in their clinic" ON public.patients
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.clinic_users cu
            WHERE cu.user_id = auth.uid()
            AND cu.clinic_id = patients.clinic_id
            AND cu.role IN ('admin', 'manager', 'dentist')
        )
    );
