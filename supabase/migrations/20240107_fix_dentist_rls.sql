-- Fix RLS policies for dentist role
-- Dentists should be able to see patients, appointments, and other clinic data

-- Enable RLS on key tables if not already enabled
ALTER TABLE IF EXISTS public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate with correct permissions)
DROP POLICY IF EXISTS "Users can view patients in their clinic" ON public.patients;
DROP POLICY IF EXISTS "Users can view appointments in their clinic" ON public.appointments;

-- Patients: All clinic members can view
CREATE POLICY "Users can view patients in their clinic" ON public.patients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.clinic_users cu
            WHERE cu.user_id = auth.uid()
            AND cu.clinic_id = patients.clinic_id
        )
    );

-- Patients: Admins, managers, dentists, and editors can insert
CREATE POLICY "Users can insert patients in their clinic" ON public.patients
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clinic_users cu
            WHERE cu.user_id = auth.uid()
            AND cu.clinic_id = patients.clinic_id
            AND cu.role IN ('admin', 'manager', 'dentist', 'editor')
        )
    );

-- Patients: Admins, managers, dentists, and editors can update
CREATE POLICY "Users can update patients in their clinic" ON public.patients
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.clinic_users cu
            WHERE cu.user_id = auth.uid()
            AND cu.clinic_id = patients.clinic_id
            AND cu.role IN ('admin', 'manager', 'dentist', 'editor')
        )
    );

-- Appointments: All clinic members can view
CREATE POLICY "Users can view appointments in their clinic" ON public.appointments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.clinic_users cu
            WHERE cu.user_id = auth.uid()
            AND cu.clinic_id = appointments.clinic_id
        )
    );

-- Appointments: Admins, managers, dentists, and editors can insert
CREATE POLICY "Users can insert appointments in their clinic" ON public.appointments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clinic_users cu
            WHERE cu.user_id = auth.uid()
            AND cu.clinic_id = appointments.clinic_id
            AND cu.role IN ('admin', 'manager', 'dentist', 'editor')
        )
    );

-- Appointments: Admins, managers, dentists, and editors can update
CREATE POLICY "Users can update appointments in their clinic" ON public.appointments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.clinic_users cu
            WHERE cu.user_id = auth.uid()
            AND cu.clinic_id = appointments.clinic_id
            AND cu.role IN ('admin', 'manager', 'dentist', 'editor')
        )
    );

-- Appointments: Admins and managers can delete
CREATE POLICY "Admins can delete appointments" ON public.appointments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.clinic_users cu
            WHERE cu.user_id = auth.uid()
            AND cu.clinic_id = appointments.clinic_id
            AND cu.role IN ('admin', 'manager')
        )
    );
