-- =============================================================
-- Fix: normaliza brand de card_fee_config e card_brands para lowercase
-- Motivo: defaults da UI eram TitleCase ('Elo'), dados antigos eram
--         lowercase ('elo'). Resultado: chips duplicados e regras
--         "fantasma" no fim da lista por ordenação case-sensitive.
-- =============================================================

-- 1) Merge duplicatas em card_fee_config — mantém a regra mais recente
--    quando há colisão case-insensitive
WITH ranked AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY card_machine_id, lower(brand), payment_type, installments
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM card_fee_config
  WHERE card_machine_id IS NOT NULL
)
DELETE FROM card_fee_config
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2) Normaliza todos os brand pra lowercase
UPDATE card_fee_config
SET brand = lower(trim(brand))
WHERE brand <> lower(trim(brand));

-- 3) Mesma coisa em card_brands (display name) — dedupe primeiro
WITH ranked_brands AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY clinic_id, lower(name)
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM card_brands
)
DELETE FROM card_brands
WHERE id IN (SELECT id FROM ranked_brands WHERE rn > 1);

UPDATE card_brands
SET name = lower(trim(name))
WHERE name <> lower(trim(name));
