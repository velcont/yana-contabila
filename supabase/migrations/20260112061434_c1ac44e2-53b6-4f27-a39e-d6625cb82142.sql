-- ============================================
-- FAZA 1: Funcția RPC verify_ai_access
-- Verifică centralizat toate condițiile de acces AI
-- ============================================

CREATE OR REPLACE FUNCTION public.verify_ai_access(
  p_user_id UUID, 
  p_endpoint TEXT DEFAULT 'chat-ai'
)
RETURNS TABLE(
  can_proceed BOOLEAN,
  access_type TEXT,
  remaining_cents INTEGER,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile RECORD;
  v_budget RECORD;
  v_current_month TEXT;
  v_usage_cents INTEGER;
  v_remaining_cents INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  v_current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- 1. Verificăm dacă e admin (bypass complet)
  SELECT has_role(p_user_id, 'admin'::app_role) INTO v_is_admin;
  IF v_is_admin THEN
    RETURN QUERY SELECT 
      true::BOOLEAN,
      'admin'::TEXT,
      999999::INTEGER,
      'Acces admin nelimitat'::TEXT;
    RETURN;
  END IF;
  
  -- 2. Obținem profilul utilizatorului
  SELECT 
    subscription_status,
    subscription_ends_at,
    has_free_access,
    trial_ends_at,
    stripe_subscription_id,
    ai_credits
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_profile IS NULL THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      'none'::TEXT,
      0::INTEGER,
      'Profil utilizator negăsit'::TEXT;
    RETURN;
  END IF;
  
  -- 3. Verificăm abonament Stripe activ
  IF v_profile.subscription_status = 'active' AND 
     v_profile.stripe_subscription_id IS NOT NULL AND
     (v_profile.subscription_ends_at IS NULL OR v_profile.subscription_ends_at > NOW()) THEN
    RETURN QUERY SELECT 
      true::BOOLEAN,
      'subscription'::TEXT,
      999999::INTEGER,
      'Abonament activ'::TEXT;
    RETURN;
  END IF;
  
  -- 4. Verificăm trial activ
  IF v_profile.trial_ends_at IS NOT NULL AND v_profile.trial_ends_at > NOW() THEN
    -- Obținem bugetul trial
    SELECT 
      COALESCE(trial_credits_cents, 1000) AS trial_budget,
      COALESCE(trial_credits_used_cents, 0) AS trial_used
    INTO v_budget
    FROM ai_budget_limits
    WHERE user_id = p_user_id AND is_active = true
    LIMIT 1;
    
    IF v_budget IS NULL THEN
      -- Nu are buget setat, îl creăm cu default
      v_remaining_cents := 1000;
    ELSE
      v_remaining_cents := v_budget.trial_budget - v_budget.trial_used;
    END IF;
    
    IF v_remaining_cents > 0 THEN
      RETURN QUERY SELECT 
        true::BOOLEAN,
        'trial'::TEXT,
        v_remaining_cents::INTEGER,
        'Trial activ'::TEXT;
      RETURN;
    ELSE
      RETURN QUERY SELECT 
        false::BOOLEAN,
        'trial_exhausted'::TEXT,
        0::INTEGER,
        'Creditele de trial au fost epuizate. Activează un abonament pentru acces nelimitat.'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- 5. Verificăm has_free_access cu buget
  IF v_profile.has_free_access = true THEN
    SELECT 
      COALESCE(monthly_budget_cents, 2000) AS budget,
      COALESCE((
        SELECT SUM(estimated_cost_cents) 
        FROM ai_usage 
        WHERE user_id = p_user_id AND month_year = v_current_month
      ), 0) AS used
    INTO v_budget
    FROM ai_budget_limits
    WHERE user_id = p_user_id AND is_active = true
    LIMIT 1;
    
    IF v_budget IS NULL THEN
      -- Free access fără buget - setăm implicit 20 RON/lună
      v_remaining_cents := 2000;
    ELSE
      v_remaining_cents := v_budget.budget - v_budget.used;
    END IF;
    
    IF v_remaining_cents > 0 THEN
      RETURN QUERY SELECT 
        true::BOOLEAN,
        'free_access'::TEXT,
        v_remaining_cents::INTEGER,
        'Acces gratuit'::TEXT;
      RETURN;
    ELSE
      RETURN QUERY SELECT 
        false::BOOLEAN,
        'free_access_exhausted'::TEXT,
        0::INTEGER,
        'Bugetul lunar de acces gratuit a fost epuizat.'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- 6. Verificăm credite AI cumpărate
  IF COALESCE(v_profile.ai_credits, 0) > 0 THEN
    RETURN QUERY SELECT 
      true::BOOLEAN,
      'purchased_credits'::TEXT,
      (v_profile.ai_credits * 100)::INTEGER, -- Convertim din credite în cenți
      'Credite AI cumpărate'::TEXT;
    RETURN;
  END IF;
  
  -- 7. Fără acces
  RETURN QUERY SELECT 
    false::BOOLEAN,
    'none'::TEXT,
    0::INTEGER,
    'Activează un abonament sau cumpără credite pentru acces AI.'::TEXT;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.verify_ai_access(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_ai_access(UUID, TEXT) TO service_role;

-- ============================================
-- FAZA 4: Setare bugete pentru utilizatori existenți fără ai_budget_limits
-- ============================================

-- 1. Utilizatori cu trial activ fără buget
INSERT INTO ai_budget_limits (user_id, monthly_budget_cents, trial_credits_cents, trial_credits_used_cents, trial_credits_granted_at, is_active)
SELECT 
  p.id, 
  1000,  -- 10 RON buget lunar
  1000,  -- 10 RON credite trial
  0,     -- 0 folosit
  NOW(), -- Acordat acum
  true
FROM profiles p
WHERE p.trial_ends_at > NOW() 
  AND p.subscription_status != 'active'
  AND NOT EXISTS (
    SELECT 1 FROM ai_budget_limits b WHERE b.user_id = p.id
  )
ON CONFLICT DO NOTHING;

-- 2. Utilizatori cu has_free_access fără buget (20 RON/lună)
INSERT INTO ai_budget_limits (user_id, monthly_budget_cents, is_active)
SELECT 
  p.id, 
  2000,  -- 20 RON buget lunar pentru free_access
  true
FROM profiles p
WHERE p.has_free_access = true
  AND NOT EXISTS (
    SELECT 1 FROM ai_budget_limits b WHERE b.user_id = p.id
  )
ON CONFLICT DO NOTHING;

-- Adaugă comentariu pentru claritate
COMMENT ON FUNCTION public.verify_ai_access IS 'Verifică centralizat accesul AI: admin bypass, abonament activ, trial valid cu buget, free_access cu buget, credite cumpărate';