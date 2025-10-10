-- Fix ambiguous user_id column reference
CREATE OR REPLACE FUNCTION public.get_monthly_ai_usage(
  p_user_id uuid DEFAULT NULL::uuid,
  p_month_year text DEFAULT NULL::text
)
RETURNS TABLE(
  user_id uuid,
  month_year text,
  total_requests bigint,
  total_tokens bigint,
  total_cost_cents bigint,
  budget_cents integer,
  usage_percent numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_user_id UUID;
  target_month TEXT;
  v_budget_cents INTEGER;
  v_total_requests BIGINT;
  v_total_tokens BIGINT;
  v_total_cost_cents BIGINT;
  v_usage_percent NUMERIC;
BEGIN
  -- Determine target user and month
  target_user_id := COALESCE(p_user_id, auth.uid());
  target_month := COALESCE(p_month_year, TO_CHAR(NOW(), 'YYYY-MM'));

  -- Get budget for user (default to 1000 cents = $10)
  SELECT COALESCE(monthly_budget_cents, 1000)
  INTO v_budget_cents
  FROM public.ai_budget_limits
  WHERE ai_budget_limits.user_id = target_user_id 
    AND ai_budget_limits.is_active = true
  ORDER BY updated_at DESC
  LIMIT 1;

  -- If no budget found, use default
  v_budget_cents := COALESCE(v_budget_cents, 1000);

  -- Get usage stats
  SELECT 
    COALESCE(COUNT(*), 0)::BIGINT,
    COALESCE(SUM(total_tokens), 0)::BIGINT,
    COALESCE(SUM(estimated_cost_cents), 0)::BIGINT
  INTO v_total_requests, v_total_tokens, v_total_cost_cents
  FROM public.ai_usage
  WHERE ai_usage.user_id = target_user_id
    AND ai_usage.month_year = target_month;

  -- Calculate usage percentage
  IF v_budget_cents > 0 THEN
    v_usage_percent := (v_total_cost_cents::NUMERIC / v_budget_cents::NUMERIC * 100);
  ELSE
    v_usage_percent := 0;
  END IF;

  -- Return single row with all data
  RETURN QUERY SELECT
    target_user_id,
    target_month,
    COALESCE(v_total_requests, 0),
    COALESCE(v_total_tokens, 0),
    COALESCE(v_total_cost_cents, 0),
    v_budget_cents,
    v_usage_percent;
END;
$function$;