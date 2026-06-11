-- Link card brands to each card machine.
-- Each machine can have its own accepted brands, because rates vary by machine.

ALTER TABLE public.card_brands
  ADD COLUMN IF NOT EXISTS card_machine_id uuid REFERENCES public.card_machines(id) ON DELETE CASCADE;

-- The old model had a clinic-level unique index, usually named
-- idx_card_brands_unique, on (clinic_id, lower(name)). That prevents the same
-- brand from existing on two different machines in the same clinic.
DROP INDEX IF EXISTS public.idx_card_brands_unique;
DROP INDEX IF EXISTS public.uq_card_brands_clinic_name;

CREATE INDEX IF NOT EXISTS idx_card_brands_machine
  ON public.card_brands(card_machine_id)
  WHERE card_machine_id IS NOT NULL;

-- Remove accidental empty-name duplicates before creating per-machine rows.
DELETE FROM public.card_brands cb
USING public.card_brands older
WHERE cb.card_machine_id IS NULL
  AND older.card_machine_id IS NULL
  AND cb.clinic_id = older.clinic_id
  AND lower(trim(cb.name)) = lower(trim(older.name))
  AND cb.id > older.id;

-- Copy existing clinic-level brands to each active machine in the same clinic.
INSERT INTO public.card_brands (clinic_id, card_machine_id, name, is_default)
SELECT
  cb.clinic_id,
  cm.id,
  cb.name,
  coalesce(cb.is_default, false)
FROM public.card_brands cb
JOIN public.card_machines cm
  ON cm.clinic_id = cb.clinic_id
WHERE cb.card_machine_id IS NULL
  AND trim(cb.name) <> ''
  AND cm.active = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.card_brands existing
    WHERE existing.clinic_id = cb.clinic_id
      AND existing.card_machine_id = cm.id
      AND lower(existing.name) = lower(cb.name)
  );

-- Drop old global duplicates after they were copied to machines.
DELETE FROM public.card_brands
WHERE card_machine_id IS NULL;

-- If a previous attempt partially created machine-level rows, normalize those
-- duplicates before enforcing the new machine-level uniqueness rule.
DELETE FROM public.card_brands cb
USING public.card_brands older
WHERE cb.card_machine_id IS NOT NULL
  AND older.card_machine_id IS NOT NULL
  AND cb.card_machine_id = older.card_machine_id
  AND lower(trim(cb.name)) = lower(trim(older.name))
  AND cb.id > older.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_card_brands_machine_name
  ON public.card_brands(card_machine_id, lower(name))
  WHERE card_machine_id IS NOT NULL;
