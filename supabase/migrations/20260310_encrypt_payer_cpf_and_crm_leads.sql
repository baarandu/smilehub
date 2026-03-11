-- =============================================
-- Phase 3: Encrypt payer_cpf + CRM leads contact data
-- LGPD Compliance — Organiza Odonto
-- =============================================
-- None of these fields are used in WHERE/ILIKE/search.
-- payer_cpf: display + JS aggregation (IR reporting)
-- crm_leads phone/email: display only
-- =============================================

-- =========================================
-- PART A: payer_cpf in financial_transactions
-- =========================================

-- 1. Ensure column is text type
ALTER TABLE financial_transactions ALTER COLUMN payer_cpf TYPE text;

-- 2. Trigger to encrypt payer_cpf on INSERT/UPDATE
CREATE OR REPLACE FUNCTION trigger_encrypt_financial_pii()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.payer_cpf IS NOT NULL AND NEW.payer_cpf != '' AND NOT (NEW.payer_cpf LIKE 'enc:%') THEN
    NEW.payer_cpf := encrypt_pii(NEW.payer_cpf);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_financial_pii ON financial_transactions;
CREATE TRIGGER trg_encrypt_financial_pii
  BEFORE INSERT OR UPDATE ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION trigger_encrypt_financial_pii();

-- 3. Also encrypt payer_cpf in payment_receivables
ALTER TABLE payment_receivables ALTER COLUMN payer_cpf TYPE text;

CREATE OR REPLACE FUNCTION trigger_encrypt_receivable_pii()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.payer_cpf IS NOT NULL AND NEW.payer_cpf != '' AND NOT (NEW.payer_cpf LIKE 'enc:%') THEN
    NEW.payer_cpf := encrypt_pii(NEW.payer_cpf);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_receivable_pii ON payment_receivables;
CREATE TRIGGER trg_encrypt_receivable_pii
  BEFORE INSERT OR UPDATE ON payment_receivables
  FOR EACH ROW EXECUTE FUNCTION trigger_encrypt_receivable_pii();

-- 4. Create secure view for financial_transactions (only decrypts payer_cpf)
CREATE OR REPLACE VIEW financial_transactions_secure WITH (security_invoker = on) AS
SELECT
  *,
  decrypt_pii(payer_cpf) AS payer_cpf_decrypted
FROM financial_transactions;

GRANT SELECT ON financial_transactions_secure TO authenticated;
GRANT SELECT ON financial_transactions_secure TO service_role;

-- Note: We use payer_cpf_decrypted as a separate column to avoid breaking
-- the many existing queries that use financial_transactions directly.
-- Only incomeTaxService needs the decrypted value.

-- 5. Encrypt existing payer_cpf data
UPDATE financial_transactions
SET updated_at = updated_at
WHERE payer_cpf IS NOT NULL
  AND payer_cpf != ''
  AND NOT (payer_cpf LIKE 'enc:%');

UPDATE payment_receivables
SET updated_at = updated_at
WHERE payer_cpf IS NOT NULL
  AND payer_cpf != ''
  AND NOT (payer_cpf LIKE 'enc:%');

-- =========================================
-- PART B: CRM leads phone and email
-- =========================================

-- 6. Ensure columns are text type
ALTER TABLE crm_leads ALTER COLUMN phone TYPE text;
ALTER TABLE crm_leads ALTER COLUMN email TYPE text;

-- 7. Trigger to encrypt phone/email on INSERT/UPDATE
CREATE OR REPLACE FUNCTION trigger_encrypt_crm_lead_pii()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone != '' AND NOT (NEW.phone LIKE 'enc:%') THEN
    NEW.phone := encrypt_pii(NEW.phone);
  END IF;
  IF NEW.email IS NOT NULL AND NEW.email != '' AND NOT (NEW.email LIKE 'enc:%') THEN
    NEW.email := encrypt_pii(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_crm_lead_pii ON crm_leads;
CREATE TRIGGER trg_encrypt_crm_lead_pii
  BEFORE INSERT OR UPDATE ON crm_leads
  FOR EACH ROW EXECUTE FUNCTION trigger_encrypt_crm_lead_pii();

-- 8. Create secure view for crm_leads
CREATE OR REPLACE VIEW crm_leads_secure WITH (security_invoker = on) AS
SELECT
  id, clinic_id, name,
  decrypt_pii(phone) AS phone,
  decrypt_pii(email) AS email,
  source_id, stage_id, assigned_to, patient_id,
  lost_reason, notes, next_action, next_action_date,
  position,
  created_at, updated_at
FROM crm_leads;

GRANT SELECT ON crm_leads_secure TO authenticated;
GRANT SELECT ON crm_leads_secure TO service_role;

-- 9. Encrypt existing CRM leads data
UPDATE crm_leads
SET updated_at = updated_at
WHERE (phone IS NOT NULL AND phone != '' AND NOT (phone LIKE 'enc:%'))
   OR (email IS NOT NULL AND email != '' AND NOT (email LIKE 'enc:%'));
