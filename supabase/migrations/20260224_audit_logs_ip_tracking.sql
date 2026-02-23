-- Add IP and User Agent tracking to audit_logs
-- These columns are nullable for backward compatibility.

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS request_ip text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_agent text;

-- Index on request_ip for querying by IP
CREATE INDEX IF NOT EXISTS audit_logs_request_ip_idx ON public.audit_logs(request_ip);
