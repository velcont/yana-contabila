
CREATE OR REPLACE FUNCTION public.get_revenue_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_active_subs integer;
  v_mrr_ron numeric;
  v_trial_active integer;
  v_trial_expiring_7d integer;
  v_trial_expired_unpaid integer;
  v_total_signups integer;
  v_total_paid_ever integer;
  v_conversion_rate numeric;
  v_revenue_this_month_ron numeric;
  v_revenue_last_30d_ron numeric;
  v_payments_this_month integer;
  v_free_access integer;
  v_recent_payments jsonb;
  v_expiring_soon jsonb;
BEGIN
  SELECT public.has_role(auth.uid(), 'admin'::app_role) INTO v_is_admin;
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  -- Active paying subscribers (real-time check)
  SELECT COUNT(*) INTO v_active_subs
  FROM profiles
  WHERE subscription_status = 'active'
    AND stripe_subscription_id IS NOT NULL
    AND subscription_ends_at > NOW();

  -- MRR (49 RON × active subs)
  v_mrr_ron := v_active_subs * 49;

  -- Free access users (Velcont clients)
  SELECT COUNT(*) INTO v_free_access
  FROM profiles
  WHERE has_free_access = true;

  -- Active trials
  SELECT COUNT(*) INTO v_trial_active
  FROM profiles
  WHERE trial_ends_at > NOW()
    AND (subscription_status IS NULL OR subscription_status != 'active' OR stripe_subscription_id IS NULL)
    AND has_free_access = false;

  -- Trials expiring in next 7 days
  SELECT COUNT(*) INTO v_trial_expiring_7d
  FROM profiles
  WHERE trial_ends_at > NOW()
    AND trial_ends_at <= NOW() + INTERVAL '7 days'
    AND (subscription_status IS NULL OR subscription_status != 'active' OR stripe_subscription_id IS NULL)
    AND has_free_access = false;

  -- Expired trials, never paid (lost leads)
  SELECT COUNT(*) INTO v_trial_expired_unpaid
  FROM profiles
  WHERE trial_ends_at <= NOW()
    AND (subscription_status IS NULL OR subscription_status != 'active' OR stripe_subscription_id IS NULL)
    AND has_free_access = false;

  -- Conversion rate
  SELECT COUNT(*) INTO v_total_signups FROM profiles WHERE has_free_access = false;
  SELECT COUNT(DISTINCT user_id) INTO v_total_paid_ever FROM subscription_payments WHERE status = 'paid';
  IF v_total_signups > 0 THEN
    v_conversion_rate := ROUND((v_total_paid_ever::numeric / v_total_signups::numeric) * 100, 2);
  ELSE
    v_conversion_rate := 0;
  END IF;

  -- Revenue this calendar month
  SELECT COALESCE(SUM(amount_paid_cents), 0) / 100.0, COUNT(*)
  INTO v_revenue_this_month_ron, v_payments_this_month
  FROM subscription_payments
  WHERE status = 'paid'
    AND payment_date >= date_trunc('month', NOW());

  -- Revenue last 30 days (rolling)
  SELECT COALESCE(SUM(amount_paid_cents), 0) / 100.0
  INTO v_revenue_last_30d_ron
  FROM subscription_payments
  WHERE status = 'paid'
    AND payment_date >= NOW() - INTERVAL '30 days';

  -- Recent payments (last 10)
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_recent_payments
  FROM (
    SELECT sp.payment_date, sp.amount_paid_cents, sp.currency, p.email, p.full_name
    FROM subscription_payments sp
    LEFT JOIN profiles p ON p.id = sp.user_id
    WHERE sp.status = 'paid'
    ORDER BY sp.payment_date DESC
    LIMIT 10
  ) t;

  -- Trials expiring soon (next 7 days, top 10)
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_expiring_soon
  FROM (
    SELECT email, full_name, trial_ends_at
    FROM profiles
    WHERE trial_ends_at > NOW()
      AND trial_ends_at <= NOW() + INTERVAL '7 days'
      AND (subscription_status IS NULL OR subscription_status != 'active' OR stripe_subscription_id IS NULL)
      AND has_free_access = false
    ORDER BY trial_ends_at ASC
    LIMIT 10
  ) t;

  RETURN jsonb_build_object(
    'mrr_ron', v_mrr_ron,
    'arr_ron', v_mrr_ron * 12,
    'active_subscribers', v_active_subs,
    'free_access_users', v_free_access,
    'trial_active', v_trial_active,
    'trial_expiring_7d', v_trial_expiring_7d,
    'trial_expired_unpaid', v_trial_expired_unpaid,
    'total_signups', v_total_signups,
    'total_paid_ever', v_total_paid_ever,
    'conversion_rate_pct', v_conversion_rate,
    'revenue_this_month_ron', v_revenue_this_month_ron,
    'revenue_last_30d_ron', v_revenue_last_30d_ron,
    'payments_this_month', v_payments_this_month,
    'recent_payments', v_recent_payments,
    'expiring_soon', v_expiring_soon,
    'generated_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_revenue_stats() TO authenticated;
