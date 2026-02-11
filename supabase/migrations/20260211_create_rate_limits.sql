-- Rate limiting table for Edge Functions
-- Used by _shared/rateLimit.ts to track and enforce request limits

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier text NOT NULL,
  endpoint text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for fast lookups (identifier + endpoint + time window)
CREATE INDEX idx_rate_limits_lookup
  ON api_rate_limits (identifier, endpoint, created_at DESC);

-- Auto-cleanup function: removes records older than 2 hours
-- Call via pg_cron or manually: SELECT cleanup_rate_limits();
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM api_rate_limits WHERE created_at < now() - interval '2 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS (service role key bypasses it, no policies needed)
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
