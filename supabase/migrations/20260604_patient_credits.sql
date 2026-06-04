-- ============================================================
-- Patient Credits System
-- Tabela para rastrear saldo de crédito (positivo) de pacientes
-- quando pagam a mais, e histórico de utilização em novos pagamentos.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.patient_credits (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id    uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id   uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  
  type         text NOT NULL CHECK (type IN ('credit', 'debit')), -- credit = added balance, debit = used balance
  amount       numeric NOT NULL CHECK (amount > 0),
  description  text NOT NULL, -- ex: "Pagamento a maior via PIX", "Uso em limpeza (Dente 11)"
  
  related_transaction_id uuid REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
  
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index para busca rápida por paciente
CREATE INDEX idx_patient_credits_patient_id ON public.patient_credits(patient_id);
CREATE INDEX idx_patient_credits_clinic_id ON public.patient_credits(clinic_id);

-- RLS Policies
ALTER TABLE public.patient_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view credits in their clinics"
  ON public.patient_credits FOR SELECT
  TO authenticated
  USING (clinic_id IN (
    SELECT cu.clinic_id FROM public.clinic_users cu WHERE cu.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert credits in their clinics"
  ON public.patient_credits FOR INSERT
  TO authenticated
  WITH CHECK (clinic_id IN (
    SELECT cu.clinic_id FROM public.clinic_users cu WHERE cu.user_id = auth.uid()
  ));

-- Não permitimos UPDATE e DELETE para garantir auditoria imutável do crédito.
-- Se um lançamento foi errado, lança-se um de compensação (debit ou credit).
