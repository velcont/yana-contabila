-- Create AI usage tracking table
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Request details
  endpoint TEXT NOT NULL, -- 'chat-ai', 'analyze-balance', 'generate-predictions', etc.
  model TEXT NOT NULL, -- 'google/gemini-2.5-flash', 'openai/gpt-5', etc.
  
  -- Token consumption
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  
  -- Cost tracking (in USD cents)
  estimated_cost_cents INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  request_duration_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  
  -- Monthly tracking
  month_year TEXT NOT NULL, -- Format: 'YYYY-MM' pentru agregare rapidă
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for fast queries
CREATE INDEX idx_ai_usage_user_month ON public.ai_usage(user_id, month_year);
CREATE INDEX idx_ai_usage_created_at ON public.ai_usage(created_at DESC);
CREATE INDEX idx_ai_usage_endpoint ON public.ai_usage(endpoint);

-- Enable RLS
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own AI usage"
ON public.ai_usage
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all AI usage"
ON public.ai_usage
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert AI usage"
ON public.ai_usage
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create AI budget limits table
CREATE TABLE IF NOT EXISTS public.ai_budget_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Monthly budget in USD cents
  monthly_budget_cents INTEGER NOT NULL DEFAULT 1000, -- $10 default
  
  -- Alert thresholds (percentage of budget)
  alert_at_percent INTEGER NOT NULL DEFAULT 80, -- Alert at 80% usage
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.ai_budget_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own budget limits"
ON public.ai_budget_limits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own budget limits"
ON public.ai_budget_limits
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budget limits"
ON public.ai_budget_limits
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all budget limits"
ON public.ai_budget_limits
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to get monthly AI usage and cost
CREATE OR REPLACE FUNCTION public.get_monthly_ai_usage(
  p_user_id UUID DEFAULT NULL,
  p_month_year TEXT DEFAULT NULL
)
RETURNS TABLE(
  user_id UUID,
  month_year TEXT,
  total_requests BIGINT,
  total_tokens BIGINT,
  total_cost_cents BIGINT,
  budget_cents INTEGER,
  usage_percent NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  target_month TEXT;
BEGIN
  -- Use provided user_id or current user
  target_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Use provided month or current month
  target_month := COALESCE(p_month_year, TO_CHAR(NOW(), 'YYYY-MM'));
  
  RETURN QUERY
  SELECT 
    usage.user_id,
    usage.month_year,
    COUNT(*)::BIGINT as total_requests,
    SUM(usage.total_tokens)::BIGINT as total_tokens,
    SUM(usage.estimated_cost_cents)::BIGINT as total_cost_cents,
    COALESCE(limits.monthly_budget_cents, 1000) as budget_cents,
    CASE 
      WHEN COALESCE(limits.monthly_budget_cents, 1000) > 0 
      THEN (SUM(usage.estimated_cost_cents)::NUMERIC / COALESCE(limits.monthly_budget_cents, 1000)::NUMERIC * 100)
      ELSE 0
    END as usage_percent
  FROM public.ai_usage usage
  LEFT JOIN public.ai_budget_limits limits ON limits.user_id = usage.user_id
  WHERE usage.user_id = target_user_id
    AND usage.month_year = target_month
  GROUP BY usage.user_id, usage.month_year, limits.monthly_budget_cents;
END;
$$;

-- Create function to check if user can make AI request (budget check)
CREATE OR REPLACE FUNCTION public.check_ai_budget(
  p_user_id UUID
)
RETURNS TABLE(
  can_proceed BOOLEAN,
  current_usage_cents INTEGER,
  budget_cents INTEGER,
  usage_percent NUMERIC,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month TEXT;
  v_usage_cents INTEGER;
  v_budget_cents INTEGER;
  v_usage_percent NUMERIC;
BEGIN
  current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Get current usage
  SELECT 
    COALESCE(SUM(estimated_cost_cents), 0)::INTEGER,
    COALESCE(MAX(limits.monthly_budget_cents), 1000)::INTEGER
  INTO v_usage_cents, v_budget_cents
  FROM public.ai_usage usage
  LEFT JOIN public.ai_budget_limits limits ON limits.user_id = usage.user_id
  WHERE usage.user_id = p_user_id
    AND usage.month_year = current_month;
  
  v_usage_percent := (v_usage_cents::NUMERIC / v_budget_cents::NUMERIC * 100);
  
  RETURN QUERY SELECT
    v_usage_cents < v_budget_cents as can_proceed,
    v_usage_cents as current_usage_cents,
    v_budget_cents as budget_cents,
    v_usage_percent as usage_percent,
    CASE 
      WHEN v_usage_cents >= v_budget_cents THEN 'Budget lunar depășit. Contactează administratorul.'
      WHEN v_usage_percent > 90 THEN 'Aproape de limita bugetului (' || ROUND(v_usage_percent, 1)::TEXT || '%)'
      ELSE 'OK'
    END as message;
END;
$$;