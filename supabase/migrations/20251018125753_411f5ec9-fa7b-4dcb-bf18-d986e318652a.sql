-- Add trial credits tracking to ai_budget_limits
ALTER TABLE public.ai_budget_limits 
ADD COLUMN IF NOT EXISTS trial_credits_cents integer DEFAULT 5000,
ADD COLUMN IF NOT EXISTS trial_credits_used_cents integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_credits_granted_at timestamp with time zone DEFAULT NULL;

COMMENT ON COLUMN public.ai_budget_limits.trial_credits_cents IS 'Credite gratuite de probă în cents (5000 cents = 50 RON = ~25-50 conversații)';
COMMENT ON COLUMN public.ai_budget_limits.trial_credits_used_cents IS 'Credite de probă consumate în cents';
COMMENT ON COLUMN public.ai_budget_limits.trial_credits_granted_at IS 'Când au fost acordate creditele de probă';

-- Function to grant trial credits for premium users
CREATE OR REPLACE FUNCTION public.grant_trial_credits_if_eligible(p_user_id uuid)
RETURNS TABLE(granted boolean, trial_credits_cents integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_premium boolean;
  has_trial boolean;
  v_trial_credits integer;
BEGIN
  -- Check if user is premium (has active subscription)
  SELECT 
    subscription_status = 'active' INTO is_premium
  FROM profiles
  WHERE id = p_user_id;

  IF NOT is_premium THEN
    RETURN QUERY SELECT false, 0, 'Doar utilizatorii premium pot primi credite de probă';
    RETURN;
  END IF;

  -- Check if trial credits already granted
  SELECT 
    trial_credits_granted_at IS NOT NULL INTO has_trial
  FROM ai_budget_limits
  WHERE user_id = p_user_id AND is_active = true;

  IF has_trial THEN
    SELECT trial_credits_cents INTO v_trial_credits
    FROM ai_budget_limits
    WHERE user_id = p_user_id AND is_active = true;
    
    RETURN QUERY SELECT false, v_trial_credits, 'Creditele de probă au fost deja acordate';
    RETURN;
  END IF;

  -- Grant trial credits
  INSERT INTO ai_budget_limits (
    user_id, 
    monthly_budget_cents, 
    trial_credits_cents,
    trial_credits_granted_at,
    is_active
  )
  VALUES (
    p_user_id,
    1000, -- 10 RON default budget
    5000, -- 50 RON trial credits
    NOW(),
    true
  )
  ON CONFLICT (user_id, is_active) WHERE is_active = true
  DO UPDATE SET
    trial_credits_cents = 5000,
    trial_credits_granted_at = NOW();

  RETURN QUERY SELECT true, 5000, 'Credite de probă acordate cu succes! Ai primit 50 RON (5000 cents) pentru a testa Yana Strategica.';
END;
$$;