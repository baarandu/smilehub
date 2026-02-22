-- Delete test patient "Tetê" and all associated records (CASCADE)
-- This will automatically delete: financial_transactions, appointments, budgets,
-- consultations, anamneses, procedures, exams, prosthesis_orders, child_anamneses, etc.

DELETE FROM patients WHERE name ILIKE '%tetê%' OR name ILIKE '%tete%';
