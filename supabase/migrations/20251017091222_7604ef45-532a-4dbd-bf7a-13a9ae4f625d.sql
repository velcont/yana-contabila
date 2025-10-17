-- Fix ambiguous column error in get_monthly_ai_usage
DROP FUNCTION IF EXISTS public.get_monthly_ai_usage(uuid, text);

CREATE OR REPLACE FUNCTION public.get_monthly_ai_usage(p_user_id uuid DEFAULT NULL::uuid, p_month_year text DEFAULT NULL::text)
 RETURNS TABLE(user_id uuid, month_year text, total_requests bigint, total_tokens bigint, total_cost_cents bigint, budget_cents integer, usage_percent numeric)
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
  target_user_id := COALESCE(p_user_id, auth.uid());
  target_month := COALESCE(p_month_year, TO_CHAR(NOW(), 'YYYY-MM'));

  -- Get budget for user (default to 1000 cents = $10)
  SELECT COALESCE(limits.monthly_budget_cents, 1000)
  INTO v_budget_cents
  FROM public.ai_budget_limits limits
  WHERE limits.user_id = target_user_id 
    AND limits.is_active = true
  ORDER BY limits.updated_at DESC
  LIMIT 1;

  v_budget_cents := COALESCE(v_budget_cents, 1000);

  -- Get usage stats (fix: qualify column names)
  SELECT 
    COALESCE(COUNT(*), 0)::BIGINT,
    COALESCE(SUM(usage.total_tokens), 0)::BIGINT,
    COALESCE(SUM(usage.estimated_cost_cents), 0)::BIGINT
  INTO v_total_requests, v_total_tokens, v_total_cost_cents
  FROM public.ai_usage usage
  WHERE usage.user_id = target_user_id
    AND usage.month_year = target_month;

  IF v_budget_cents > 0 THEN
    v_usage_percent := (v_total_cost_cents::NUMERIC / v_budget_cents::NUMERIC * 100);
  ELSE
    v_usage_percent := 0;
  END IF;

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

-- Create credits_purchases table to track ALL purchases
CREATE TABLE IF NOT EXISTS public.credits_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  amount_paid_cents integer NOT NULL,
  credits_added integer NOT NULL,
  purchase_date timestamptz NOT NULL DEFAULT now(),
  package_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credits_purchases ENABLE ROW LEVEL SECURITY;

-- Policies for credits_purchases
CREATE POLICY "Users can view own purchases"
  ON public.credits_purchases
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases"
  ON public.credits_purchases
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can insert purchases"
  ON public.credits_purchases
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_credits_purchases_user_date 
  ON public.credits_purchases(user_id, purchase_date DESC);

CREATE INDEX IF NOT EXISTS idx_credits_purchases_stripe_session 
  ON public.credits_purchases(stripe_checkout_session_id);

-- Create function to get user detailed report
CREATE OR REPLACE FUNCTION public.get_user_credits_report(p_user_id uuid)
RETURNS TABLE(
  user_email text,
  total_purchased_cents integer,
  total_credits_added integer,
  current_budget_cents integer,
  total_spent_cents integer,
  remaining_budget_cents integer,
  usage_percent numeric,
  last_purchase_date timestamptz,
  purchase_count bigint,
  usage_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_email text;
  v_total_purchased integer;
  v_total_credits integer;
  v_current_budget integer;
  v_total_spent integer;
  v_remaining integer;
  v_usage_pct numeric;
  v_last_purchase timestamptz;
  v_purchase_count bigint;
  v_usage_count bigint;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id;

  -- Get purchase stats
  SELECT 
    COALESCE(SUM(amount_paid_cents), 0)::integer,
    COALESCE(SUM(credits_added), 0)::integer,
    COUNT(*),
    MAX(purchase_date)
  INTO v_total_purchased, v_total_credits, v_purchase_count, v_last_purchase
  FROM public.credits_purchases
  WHERE user_id = p_user_id;

  -- Get current budget
  SELECT COALESCE(monthly_budget_cents, 1000)
  INTO v_current_budget
  FROM public.ai_budget_limits
  WHERE user_id = p_user_id AND is_active = true
  ORDER BY updated_at DESC
  LIMIT 1;

  v_current_budget := COALESCE(v_current_budget, 1000);

  -- Get usage stats (current month)
  SELECT 
    COALESCE(SUM(estimated_cost_cents), 0)::integer,
    COUNT(*)
  INTO v_total_spent, v_usage_count
  FROM public.ai_usage
  WHERE user_id = p_user_id
    AND month_year = TO_CHAR(NOW(), 'YYYY-MM');

  v_remaining := v_current_budget - v_total_spent;
  
  IF v_current_budget > 0 THEN
    v_usage_pct := (v_total_spent::numeric / v_current_budget::numeric * 100);
  ELSE
    v_usage_pct := 0;
  END IF;

  RETURN QUERY SELECT
    v_user_email,
    v_total_purchased,
    v_total_credits,
    v_current_budget,
    v_total_spent,
    v_remaining,
    v_usage_pct,
    v_last_purchase,
    v_purchase_count,
    v_usage_count;
END;
$$;

-- Grant execute to authenticated users and admins
GRANT EXECUTE ON FUNCTION public.get_user_credits_report(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_ai_usage(uuid, text) TO authenticated;