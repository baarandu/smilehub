-- Permite marcar NFS-e como emitida externamente (ex.: site da prefeitura)
-- sem anexar XML/PDF no sistema.

ALTER TABLE public.nfse_documents
ADD COLUMN IF NOT EXISTS issued_externally boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.nfse_documents.issued_externally IS
  'True quando a nota foi emitida fora do sistema (prefeitura) e apenas marcada como emitida, sem anexo.';
