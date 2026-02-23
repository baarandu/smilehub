-- =============================================================
-- Migration: Terms Acceptances (P0 Compliance)
-- LGPD Art. 7º: Proof of user consent to Terms/Privacy
-- =============================================================

-- Table: terms_acceptances
CREATE TABLE IF NOT EXISTS terms_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_type text NOT NULL CHECK (policy_type IN ('terms_of_service', 'privacy_policy')),
  policy_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT NOW(),
  ip_address text,
  user_agent text,
  UNIQUE(user_id, policy_type, policy_version)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_terms_acceptances_user_id ON terms_acceptances(user_id);

-- RLS
ALTER TABLE terms_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own acceptances"
  ON terms_acceptances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own acceptances"
  ON terms_acceptances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grant access
GRANT SELECT, INSERT ON terms_acceptances TO authenticated;

-- RPC: Accept terms (idempotent)
CREATE OR REPLACE FUNCTION accept_terms(
  p_policy_type text,
  p_policy_version text,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO terms_acceptances (user_id, policy_type, policy_version, ip_address, user_agent)
  VALUES (auth.uid(), p_policy_type, p_policy_version, p_ip_address, p_user_agent)
  ON CONFLICT (user_id, policy_type, policy_version) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION accept_terms(text, text, text, text) TO authenticated;

-- RPC: Check if user accepted current terms version
CREATE OR REPLACE FUNCTION check_terms_accepted(p_policy_version text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM terms_acceptances
  WHERE user_id = auth.uid()
    AND policy_version = p_policy_version
    AND policy_type IN ('terms_of_service', 'privacy_policy')
  ;

  -- Must have accepted BOTH terms_of_service and privacy_policy
  RETURN v_count >= 2;
END;
$$;

GRANT EXECUTE ON FUNCTION check_terms_accepted(text) TO authenticated;
