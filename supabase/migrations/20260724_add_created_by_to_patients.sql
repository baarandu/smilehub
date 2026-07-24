-- Add created_by to patients. Needed as the SELECT-RLS anchor for the upcoming
-- dentist-only visibility restriction (see 20260724_dentist_only_visibility.sql).
-- Additive only: does not change any behavior on its own.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS idx_patients_created_by ON public.patients(created_by);
