-- Create analytics events table for tracking user behavior
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  page_url text,
  user_agent text,
  ip_address text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert events (for tracking)
CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events
FOR INSERT
WITH CHECK (true);

-- Policy: Admins can view all events
CREATE POLICY "Admins can view all analytics events"
ON public.analytics_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Users can view own events
CREATE POLICY "Users can view own analytics events"
ON public.analytics_events
FOR SELECT
USING (auth.uid() = user_id);

-- Create system health table
CREATE TABLE IF NOT EXISTS public.system_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('healthy', 'degraded', 'down')),
  response_time_ms integer,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  checked_at timestamp with time zone DEFAULT now()
);

-- Create index for health checks
CREATE INDEX IF NOT EXISTS idx_system_health_checked_at ON public.system_health(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_check_type ON public.system_health(check_type);

-- Enable RLS
ALTER TABLE public.system_health ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can insert health checks
CREATE POLICY "Service can insert health checks"
ON public.system_health
FOR INSERT
WITH CHECK (true);

-- Policy: Admins can view health checks
CREATE POLICY "Admins can view health checks"
ON public.system_health
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));