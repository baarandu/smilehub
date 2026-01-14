-- Script simplificado para atualizar location

-- PASSO 1: Ver os procedures com location
SELECT id, patient_id, location, date FROM procedures WHERE location IS NOT NULL LIMIT 10;

-- PASSO 2: Atualizar transações com location do procedure mais recente do mesmo paciente
UPDATE financial_transactions ft
SET location = (
    SELECT p.location
    FROM procedures p
    WHERE p.patient_id = ft.patient_id
      AND p.location IS NOT NULL
      AND p.location != ''
    ORDER BY p.date DESC
    LIMIT 1
)
WHERE ft.type = 'income'
  AND (ft.location IS NULL OR ft.location = '')
  AND ft.patient_id IS NOT NULL;

-- PASSO 3: Verificar resultado
SELECT id, description, location, payment_method
FROM financial_transactions 
WHERE type = 'income'
ORDER BY date DESC
LIMIT 10;
