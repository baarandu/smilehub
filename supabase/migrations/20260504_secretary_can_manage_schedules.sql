-- Permite que o role 'assistant' (Secretaria) defina horarios de atendimento
-- dos dentistas. As policies de schedule_settings (20260222) e
-- professional_schedule_cycle (20260504_schedule_settings_cycle) so liberavam
-- ('admin', 'dentist') via coluna legada `role`, deixando a secretaria fora —
-- e pior, ignorando o array `roles` que e o canonico no sistema.
--
-- Fix: aceitar 'admin', 'dentist' e 'assistant' por qualquer das duas colunas
-- (role legado OU roles array), igual ao padrao usado em
-- 20260504_fix_clinics_admin_rls.

-- ---- schedule_settings ----
DROP POLICY IF EXISTS "schedule_settings_insert" ON schedule_settings;
CREATE POLICY "schedule_settings_insert" ON schedule_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_users cu
      WHERE cu.clinic_id = schedule_settings.clinic_id
        AND cu.user_id = auth.uid()
        AND (
          cu.role IN ('admin', 'dentist', 'assistant')
          OR cu.roles && ARRAY['admin', 'dentist', 'assistant']
        )
    )
  );

DROP POLICY IF EXISTS "schedule_settings_update" ON schedule_settings;
CREATE POLICY "schedule_settings_update" ON schedule_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM clinic_users cu
      WHERE cu.clinic_id = schedule_settings.clinic_id
        AND cu.user_id = auth.uid()
        AND (
          cu.role IN ('admin', 'dentist', 'assistant')
          OR cu.roles && ARRAY['admin', 'dentist', 'assistant']
        )
    )
  );

DROP POLICY IF EXISTS "schedule_settings_delete" ON schedule_settings;
CREATE POLICY "schedule_settings_delete" ON schedule_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM clinic_users cu
      WHERE cu.clinic_id = schedule_settings.clinic_id
        AND cu.user_id = auth.uid()
        AND (
          cu.role IN ('admin', 'dentist', 'assistant')
          OR cu.roles && ARRAY['admin', 'dentist', 'assistant']
        )
    )
  );

-- ---- professional_schedule_cycle ----
DROP POLICY IF EXISTS "professional_schedule_cycle_insert" ON professional_schedule_cycle;
CREATE POLICY "professional_schedule_cycle_insert" ON professional_schedule_cycle
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_users cu
      WHERE cu.clinic_id = professional_schedule_cycle.clinic_id
        AND cu.user_id = auth.uid()
        AND (
          cu.role IN ('admin', 'dentist', 'assistant')
          OR cu.roles && ARRAY['admin', 'dentist', 'assistant']
        )
    )
  );

DROP POLICY IF EXISTS "professional_schedule_cycle_update" ON professional_schedule_cycle;
CREATE POLICY "professional_schedule_cycle_update" ON professional_schedule_cycle
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM clinic_users cu
      WHERE cu.clinic_id = professional_schedule_cycle.clinic_id
        AND cu.user_id = auth.uid()
        AND (
          cu.role IN ('admin', 'dentist', 'assistant')
          OR cu.roles && ARRAY['admin', 'dentist', 'assistant']
        )
    )
  );

DROP POLICY IF EXISTS "professional_schedule_cycle_delete" ON professional_schedule_cycle;
CREATE POLICY "professional_schedule_cycle_delete" ON professional_schedule_cycle
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM clinic_users cu
      WHERE cu.clinic_id = professional_schedule_cycle.clinic_id
        AND cu.user_id = auth.uid()
        AND (
          cu.role IN ('admin', 'dentist', 'assistant')
          OR cu.roles && ARRAY['admin', 'dentist', 'assistant']
        )
    )
  );
