-- Add signature requirement flags to document_templates
-- Replaces the previous name-based heuristic with explicit per-template config.

BEGIN;

ALTER TABLE document_templates
  ADD COLUMN IF NOT EXISTS requires_patient_signature boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_dentist_signature boolean NOT NULL DEFAULT false;

-- Backfill existing rows preserving previous behavior:

-- 1) Termos / TCLE / Autorizações  → patient signature only
UPDATE document_templates SET
  requires_patient_signature = true,
  requires_dentist_signature = false
WHERE
  lower(name) LIKE '%termo%' OR
  lower(name) LIKE '%consentimento%' OR
  lower(name) LIKE '%autoriza%' OR
  lower(name) LIKE '%tcle%';

-- 2) Receituário / Atestado / Encaminhamento / Declaração  → dentist signature only
UPDATE document_templates SET
  requires_patient_signature = false,
  requires_dentist_signature = true
WHERE
  lower(name) LIKE '%receitu%' OR
  lower(name) LIKE '%atestado%' OR
  lower(name) LIKE '%encaminhamento%' OR
  lower(name) LIKE '%declaração%' OR
  lower(name) LIKE '%declaracao%';

-- 3) Anything else (custom templates without keyword match) → both signatures
UPDATE document_templates SET
  requires_patient_signature = true,
  requires_dentist_signature = true
WHERE requires_patient_signature = false AND requires_dentist_signature = false;

COMMIT;
