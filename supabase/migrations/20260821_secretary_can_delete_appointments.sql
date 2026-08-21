-- A secretária (role 'assistant') precisava excluir consultas, mas o DELETE
-- estava restrito a admin/manager (20260220). Resultado: ela clicava na
-- lixeira, o RLS bloqueava em silêncio (0 linhas, sem erro) e o app mostrava
-- "excluída com sucesso" enquanto o agendamento voltava na tela após o refetch.
-- O mesmo silêncio afetava dentistas, que também não estavam no DELETE.
--
-- Passamos o DELETE a acompanhar o INSERT/UPDATE: os mesmos papéis que criam e
-- editam consultas também podem excluí-las. Para não abrir brecha, espelhamos a
-- visibilidade dentist-only (20260724): um usuário só-dentista só apaga as
-- próprias consultas (+ as sem dentista, ex.: encaixes), nunca as de outro
-- dentista que ele sequer enxerga. Demais papéis apagam qualquer consulta da
-- clínica.

DROP POLICY IF EXISTS "Admins can delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete appointments in their clinic" ON public.appointments;

CREATE POLICY "Users can delete appointments in their clinic" ON public.appointments
  FOR DELETE USING (
    user_has_any_role(auth.uid(), appointments.clinic_id, ARRAY['admin', 'manager', 'dentist', 'editor', 'assistant'])
    AND (
      NOT (
        user_has_any_role(auth.uid(), appointments.clinic_id, ARRAY['dentist'])
        AND NOT user_has_any_role(auth.uid(), appointments.clinic_id, ARRAY['admin'])
      )
      OR appointments.dentist_id = auth.uid()
      OR appointments.dentist_id IS NULL
    )
  );
