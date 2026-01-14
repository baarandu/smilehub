-- Script para corrigir transações existentes que têm "Recebimento" na descrição
-- Versão corrigida - primeiro verifica a estrutura da tabela

-- PASSO 1: Verificar a estrutura da tabela financial_transactions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'financial_transactions'
ORDER BY ordinal_position;

-- PASSO 2: Verificar quantas transações serão afetadas
SELECT 
    ft.id,
    ft.description AS descricao_atual,
    ft.location,
    ft.related_entity_id
FROM financial_transactions ft
WHERE ft.type = 'income' 
  AND ft.description LIKE '%Recebimento%'
  AND ft.related_entity_id IS NOT NULL;

-- PASSO 3: Ver os dados dos orçamentos vinculados
SELECT 
    ft.id,
    ft.description,
    b.notes
FROM financial_transactions ft
LEFT JOIN budgets b ON ft.related_entity_id = b.id
WHERE ft.type = 'income' 
  AND ft.description LIKE '%Recebimento%'
  AND ft.related_entity_id IS NOT NULL
LIMIT 5;

-- PASSO 4: Criar função para extrair tratamento do JSON
CREATE OR REPLACE FUNCTION extract_treatment_from_budget(notes_json TEXT)
RETURNS TABLE(treatment TEXT, pay_method TEXT, tooth TEXT, loc TEXT) AS $$
DECLARE
    parsed JSONB;
    tooth_obj JSONB;
BEGIN
    BEGIN
        parsed := notes_json::JSONB;
        
        FOR tooth_obj IN SELECT * FROM jsonb_array_elements(parsed->'teeth')
        LOOP
            IF (tooth_obj->>'status' = 'paid' OR tooth_obj->>'status' = 'completed') THEN
                treatment := (
                    SELECT string_agg(REPLACE(t::TEXT, '"', ''), ', ')
                    FROM jsonb_array_elements_text(tooth_obj->'treatments') t
                );
                pay_method := tooth_obj->>'paymentMethod';
                tooth := tooth_obj->>'tooth';
                loc := parsed->>'location';
                RETURN NEXT;
                RETURN;
            END IF;
        END LOOP;
    EXCEPTION WHEN OTHERS THEN
        RETURN;
    END;
END;
$$ LANGUAGE plpgsql;

-- PASSO 5: Testar a extração (verificar antes de atualizar)
SELECT 
    ft.id,
    ft.description AS descricao_atual,
    info.treatment,
    info.tooth,
    info.pay_method,
    info.loc
FROM financial_transactions ft
JOIN budgets b ON ft.related_entity_id = b.id,
LATERAL extract_treatment_from_budget(b.notes) info
WHERE ft.type = 'income' 
  AND ft.description LIKE '%Recebimento%';

-- PASSO 6: Atualizar as transações (somente descrição e location)
UPDATE financial_transactions ft
SET 
    description = (
        SELECT 
            info.treatment || ' - ' ||
            CASE 
                WHEN info.tooth LIKE '%Arcada%' THEN info.tooth
                ELSE 'Dente ' || info.tooth
            END
        FROM budgets b, 
             LATERAL extract_treatment_from_budget(b.notes) info
        WHERE b.id = ft.related_entity_id
        LIMIT 1
    ),
    location = COALESCE(
        ft.location,
        (
            SELECT info.loc
            FROM budgets b, 
                 LATERAL extract_treatment_from_budget(b.notes) info
            WHERE b.id = ft.related_entity_id
            LIMIT 1
        )
    )
WHERE ft.type = 'income' 
  AND ft.description LIKE '%Recebimento%'
  AND ft.related_entity_id IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM budgets b, LATERAL extract_treatment_from_budget(b.notes) info
      WHERE b.id = ft.related_entity_id AND info.treatment IS NOT NULL
  );

-- PASSO 7: Limpar função
DROP FUNCTION IF EXISTS extract_treatment_from_budget(TEXT);

-- PASSO 8: Verificar resultado
SELECT id, description, location
FROM financial_transactions 
WHERE type = 'income'
ORDER BY date DESC
LIMIT 20;
