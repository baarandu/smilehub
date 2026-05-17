-- ============================================================
-- NFS-e Documents — Notas Fiscais de Serviço Eletrônicas
-- Permite upload e organização das NFS-e emitidas externamente
-- (na prefeitura) para envio mensal ao contador.
-- ============================================================

-- 1) Tabela principal
CREATE TABLE IF NOT EXISTS public.nfse_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,

  -- Vínculos opcionais (notas avulsas de convênio podem não ter paciente)
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  budget_id uuid REFERENCES public.budgets(id) ON DELETE SET NULL,
  financial_transaction_id uuid REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
  tooth_index int,
  dentist_id uuid REFERENCES auth.users(id),

  -- Dados da nota (obrigatórios)
  invoice_number text NOT NULL,
  issue_date date NOT NULL,
  reference_month date NOT NULL, -- 1º dia do mês de competência
  service_value numeric(12,2) NOT NULL CHECK (service_value >= 0),

  -- Dados fiscais opcionais
  tax_value numeric(12,2) DEFAULT 0 CHECK (tax_value >= 0),
  net_value numeric(12,2),
  service_description text,

  -- Status e ciclo de vida
  status text NOT NULL DEFAULT 'issued'
    CHECK (status IN ('issued', 'canceled', 'substituted')),
  substituted_by_id uuid REFERENCES public.nfse_documents(id) ON DELETE SET NULL,
  cancellation_reason text,
  canceled_at timestamptz,

  -- Arquivos (storage paths)
  xml_url text,
  pdf_url text,

  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Índices
CREATE INDEX IF NOT EXISTS idx_nfse_clinic_month
  ON public.nfse_documents (clinic_id, reference_month DESC, status);

CREATE INDEX IF NOT EXISTS idx_nfse_patient
  ON public.nfse_documents (patient_id)
  WHERE patient_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nfse_transaction
  ON public.nfse_documents (financial_transaction_id)
  WHERE financial_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nfse_budget
  ON public.nfse_documents (budget_id)
  WHERE budget_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nfse_dentist
  ON public.nfse_documents (dentist_id, reference_month)
  WHERE dentist_id IS NOT NULL;

-- Número da nota é único dentro da clínica (notas substituídas mantém o número original)
CREATE UNIQUE INDEX IF NOT EXISTS idx_nfse_invoice_number_per_clinic
  ON public.nfse_documents (clinic_id, invoice_number)
  WHERE status != 'substituted';

-- 3) RLS — escopo por clínica
ALTER TABLE public.nfse_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nfse_select_own_clinic"
  ON public.nfse_documents FOR SELECT
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "nfse_insert_own_clinic"
  ON public.nfse_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "nfse_update_own_clinic"
  ON public.nfse_documents FOR UPDATE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "nfse_delete_own_clinic"
  ON public.nfse_documents FOR DELETE
  TO authenticated
  USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users WHERE user_id = auth.uid()
    )
  );

-- 4) Trigger updated_at
DROP TRIGGER IF EXISTS handle_nfse_updated_at ON public.nfse_documents;
CREATE TRIGGER handle_nfse_updated_at
  BEFORE UPDATE ON public.nfse_documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5) Trigger: preencher reference_month a partir de issue_date se não vier
CREATE OR REPLACE FUNCTION _nfse_set_reference_month()
RETURNS trigger AS $$
BEGIN
  IF NEW.reference_month IS NULL THEN
    NEW.reference_month := date_trunc('month', NEW.issue_date)::date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nfse_set_reference_month ON public.nfse_documents;
CREATE TRIGGER trg_nfse_set_reference_month
  BEFORE INSERT OR UPDATE ON public.nfse_documents
  FOR EACH ROW EXECUTE FUNCTION _nfse_set_reference_month();

-- 6) Bucket de storage (privado, XML + PDF)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nfse-documents',
  'nfse-documents',
  false,
  10485760, -- 10MB
  ARRAY['application/xml', 'text/xml', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 7) Storage policies — apenas usuários da mesma clínica
CREATE POLICY "nfse_storage_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'nfse-documents');

CREATE POLICY "nfse_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'nfse-documents');

CREATE POLICY "nfse_storage_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'nfse-documents');

CREATE POLICY "nfse_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'nfse-documents');

-- 8) RPC: relatório de pagamentos sem nota fiscal anexada (para painel central)
CREATE OR REPLACE FUNCTION public.get_payments_without_nfse(
  p_clinic_id uuid,
  p_year int,
  p_month int
)
RETURNS TABLE (
  transaction_id uuid,
  transaction_date date,
  amount numeric,
  patient_id uuid,
  patient_name text,
  dentist_id uuid,
  description text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ft.id AS transaction_id,
    ft.date AS transaction_date,
    ft.amount,
    ft.patient_id,
    p.name AS patient_name,
    ft.dentist_id,
    ft.description
  FROM public.financial_transactions ft
  LEFT JOIN public.patients p ON p.id = ft.patient_id
  WHERE ft.type = 'income'
    AND EXTRACT(YEAR FROM ft.date) = p_year
    AND EXTRACT(MONTH FROM ft.date) = p_month
    AND NOT EXISTS (
      SELECT 1 FROM public.nfse_documents n
      WHERE n.financial_transaction_id = ft.id
        AND n.status != 'canceled'
    )
    AND (
      ft.patient_id IS NULL OR
      EXISTS (
        SELECT 1 FROM public.clinic_users cu
        WHERE cu.user_id = auth.uid()
      )
    )
  ORDER BY ft.date DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_payments_without_nfse(uuid, int, int) TO authenticated;

-- 9) Comentários para documentação
COMMENT ON TABLE public.nfse_documents IS
  'NFS-e (Notas Fiscais de Serviço Eletrônicas) emitidas externamente e anexadas para envio ao contador. Inclui XML e PDF.';
COMMENT ON COLUMN public.nfse_documents.reference_month IS
  'Mês de competência (regime de competência do Simples Nacional) — 1º dia do mês';
COMMENT ON COLUMN public.nfse_documents.substituted_by_id IS
  'Quando uma nota é substituída, aponta para a nota substituta. A nota original mantém status=substituted';
