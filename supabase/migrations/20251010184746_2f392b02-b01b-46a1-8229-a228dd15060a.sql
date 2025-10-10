-- Update get_monthly_ai_usage to always return a row with budget even when no usage exists
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
BEGIN
  -- Determine target user and month
  target_user_id := COALESCE(p_user_id, auth.uid());
  target_month := COALESCE(p_month_year, TO_CHAR(NOW(), 'YYYY-MM'));

  -- Fetch latest active budget for user (fallback to default 1000 cents = $10)
  SELECT COALESCE(l.monthly_budget_cents, 1000)
    INTO v_budget_cents
  FROM LATERAL (
    SELECT monthly_budget_cents
    FROM public.ai_budget_limits
    WHERE user_id = target_user_id AND is_active = true
    ORDER BY updated_at DESC
    LIMIT 1
  ) l;

  v_budget_cents := COALESCE(v_budget_cents, 1000);

  RETURN QUERY
  WITH usage_agg AS (
    SELECT 
      user_id,
      month_year,
      COUNT(*)::BIGINT AS total_requests,
      COALESCE(SUM(total_tokens), 0)::BIGINT AS total_tokens,
      COALESCE(SUM(estimated_cost_cents), 0)::BIGINT AS total_cost_cents
    FROM public.ai_usage
    WHERE user_id = target_user_id
      AND month_year = target_month
    GROUP BY user_id, month_year
  )
  SELECT
    target_user_id AS user_id,
    target_month AS month_year,
    COALESCE(ua.total_requests, 0) AS total_requests,
    COALESCE(ua.total_tokens, 0) AS total_tokens,
    COALESCE(ua.total_cost_cents, 0) AS total_cost_cents,
    v_budget_cents AS budget_cents,
    CASE WHEN v_budget_cents > 0 THEN (COALESCE(ua.total_cost_cents, 0)::NUMERIC / v_budget_cents::NUMERIC * 100) ELSE 0 END AS usage_percent
  FROM (SELECT 1) s
  LEFT JOIN usage_agg ua ON TRUE;
END;
$function$;