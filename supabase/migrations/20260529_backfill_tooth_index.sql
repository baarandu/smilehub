
-- Migration: Backfill tooth_index in financial_transactions for historical data

UPDATE public.financial_transactions ft
SET tooth_index = (
  SELECT i - 1
  FROM public.budgets b
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE 
      WHEN b.notes IS NULL OR b.notes = '' THEN '{"teeth": []}'::jsonb
      ELSE b.notes::jsonb
    END -> 'teeth'
  ) WITH ORDINALITY AS t(elem, i)
  WHERE b.id = ft.related_entity_id
    AND (
      -- Match by direct tooth identifier in description
      ft.description LIKE '%' || (elem->>'tooth') || '%'
      OR
      -- Match by likely display names
      ft.description LIKE '%' || (
        CASE 
          WHEN elem->>'tooth' = 'ARC_SUP' THEN 'Arcada Superior'
          WHEN elem->>'tooth' = 'ARC_INF' THEN 'Arcada Inferior'
          WHEN elem->>'tooth' = 'ARC_AMBAS' THEN 'Ambas Arcadas'
          WHEN elem->>'tooth' = 'ARC_AMBAS' THEN 'Arcada Superior + Arcada Inferior'
          WHEN elem->>'tooth' ~ '^\d+$' THEN 'Dente ' || (elem->>'tooth')
          ELSE elem->>'tooth'
        END
      ) || '%'
    )
  LIMIT 1
)
WHERE ft.tooth_index IS NULL 
  AND ft.related_entity_id IS NOT NULL
  AND ft.type = 'income';
