-- =====================================================
-- RLS Policies for Multi-Tenant Architecture
-- Execute this AFTER supabase-multi-tenant-schema.sql
-- =====================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Políticas para CLINICS
-- =====================================================
CREATE POLICY "Users can view their clinic"
  ON clinics FOR SELECT
  USING (id = get_user_clinic_id());

CREATE POLICY "Admins can update clinic"
  ON clinics FOR UPDATE
  USING (id = get_user_clinic_id() AND user_is_admin());

-- =====================================================
-- Políticas para CLINIC_USERS
-- =====================================================
CREATE POLICY "Users can view clinic members"
  ON clinic_users FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Admins can insert clinic users"
  ON clinic_users FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id() AND user_is_admin());

CREATE POLICY "Admins can update clinic users"
  ON clinic_users FOR UPDATE
  USING (clinic_id = get_user_clinic_id() AND user_is_admin());

CREATE POLICY "Admins can delete clinic users"
  ON clinic_users FOR DELETE
  USING (clinic_id = get_user_clinic_id() AND user_is_admin());

-- =====================================================
-- Políticas para PATIENTS
-- =====================================================
DROP POLICY IF EXISTS "Users can view patients" ON patients;
DROP POLICY IF EXISTS "Users can insert patients" ON patients;
DROP POLICY IF EXISTS "Users can update patients" ON patients;
DROP POLICY IF EXISTS "Users can delete patients" ON patients;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON patients;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON patients;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON patients;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON patients;

CREATE POLICY "View patients from clinic"
  ON patients FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Editors can insert patients"
  ON patients FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id() AND user_can_edit());

CREATE POLICY "Editors can update patients"
  ON patients FOR UPDATE
  USING (clinic_id = get_user_clinic_id() AND user_can_edit());

CREATE POLICY "Admins can delete patients"
  ON patients FOR DELETE
  USING (clinic_id = get_user_clinic_id() AND user_is_admin());

-- =====================================================
-- Políticas para APPOINTMENTS
-- =====================================================
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON appointments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON appointments;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON appointments;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON appointments;

CREATE POLICY "View appointments from clinic"
  ON appointments FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Editors can insert appointments"
  ON appointments FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id() AND user_can_edit());

CREATE POLICY "Editors can update appointments"
  ON appointments FOR UPDATE
  USING (clinic_id = get_user_clinic_id() AND user_can_edit());

CREATE POLICY "Admins can delete appointments"
  ON appointments FOR DELETE
  USING (clinic_id = get_user_clinic_id() AND user_is_admin());

-- =====================================================
-- Políticas para FINANCIAL_TRANSACTIONS
-- =====================================================
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON financial_transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON financial_transactions;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON financial_transactions;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON financial_transactions;

CREATE POLICY "View financial from clinic"
  ON financial_transactions FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Editors can insert financial"
  ON financial_transactions FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id() AND user_can_edit());

CREATE POLICY "Editors can update financial"
  ON financial_transactions FOR UPDATE
  USING (clinic_id = get_user_clinic_id() AND user_can_edit());

CREATE POLICY "Admins can delete financial"
  ON financial_transactions FOR DELETE
  USING (clinic_id = get_user_clinic_id() AND user_is_admin());

-- =====================================================
-- Políticas para PROCEDURES
-- =====================================================
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON procedures;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON procedures;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON procedures;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON procedures;

CREATE POLICY "View procedures from clinic"
  ON procedures FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Editors can insert procedures"
  ON procedures FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id() AND user_can_edit());

CREATE POLICY "Editors can update procedures"
  ON procedures FOR UPDATE
  USING (clinic_id = get_user_clinic_id() AND user_can_edit());

CREATE POLICY "Admins can delete procedures"
  ON procedures FOR DELETE
  USING (clinic_id = get_user_clinic_id() AND user_is_admin());

-- =====================================================
-- Políticas para BUDGETS
-- =====================================================
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON budgets;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON budgets;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON budgets;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON budgets;

CREATE POLICY "View budgets from clinic"
  ON budgets FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Editors can insert budgets"
  ON budgets FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id() AND user_can_edit());

CREATE POLICY "Editors can update budgets"
  ON budgets FOR UPDATE
  USING (clinic_id = get_user_clinic_id() AND user_can_edit());

CREATE POLICY "Admins can delete budgets"
  ON budgets FOR DELETE
  USING (clinic_id = get_user_clinic_id() AND user_is_admin());

-- =====================================================
-- Políticas para EXAMS
-- =====================================================
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON exams;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON exams;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON exams;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON exams;

CREATE POLICY "View exams from clinic"
  ON exams FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Editors can insert exams"
  ON exams FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id() AND user_can_edit());

CREATE POLICY "Editors can update exams"
  ON exams FOR UPDATE
  USING (clinic_id = get_user_clinic_id() AND user_can_edit());

CREATE POLICY "Admins can delete exams"
  ON exams FOR DELETE
  USING (clinic_id = get_user_clinic_id() AND user_is_admin());

-- =====================================================
-- Políticas para ANAMNESES
-- =====================================================
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON anamneses;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON anamneses;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON anamneses;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON anamneses;

CREATE POLICY "View anamneses from clinic"
  ON anamneses FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Editors can insert anamneses"
  ON anamneses FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id() AND user_can_edit());

CREATE POLICY "Editors can update anamneses"
  ON anamneses FOR UPDATE
  USING (clinic_id = get_user_clinic_id() AND user_can_edit());

CREATE POLICY "Admins can delete anamneses"
  ON anamneses FOR DELETE
  USING (clinic_id = get_user_clinic_id() AND user_is_admin());

-- =====================================================
-- Políticas para LOCATIONS
-- =====================================================
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON locations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON locations;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON locations;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON locations;

CREATE POLICY "View locations from clinic"
  ON locations FOR SELECT
  USING (clinic_id = get_user_clinic_id());

CREATE POLICY "Admins can insert locations"
  ON locations FOR INSERT
  WITH CHECK (clinic_id = get_user_clinic_id() AND user_is_admin());

CREATE POLICY "Admins can update locations"
  ON locations FOR UPDATE
  USING (clinic_id = get_user_clinic_id() AND user_is_admin());

CREATE POLICY "Admins can delete locations"
  ON locations FOR DELETE
  USING (clinic_id = get_user_clinic_id() AND user_is_admin());
