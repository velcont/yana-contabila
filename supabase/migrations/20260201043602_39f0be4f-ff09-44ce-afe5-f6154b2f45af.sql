-- Create table for demo rate limiting (IP-based, GDPR compliant with hashing)
CREATE TABLE public.demo_rate_limits (
  ip_hash TEXT PRIMARY KEY,
  request_count INTEGER DEFAULT 1,
  first_request_at TIMESTAMPTZ DEFAULT now(),
  last_request_at TIMESTAMPTZ DEFAULT now()
);

-- No RLS needed - this table is only accessed by edge functions with service role
-- Add index for cleanup queries
CREATE INDEX idx_demo_rate_limits_first_request ON public.demo_rate_limits(first_request_at);

-- Auto-cleanup old entries (older than 24h) - function
CREATE OR REPLACE FUNCTION public.cleanup_old_demo_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM demo_rate_limits 
  WHERE first_request_at < now() - interval '24 hours';
END;
$$;