-- ========================================
-- MIGRAȚIE: Remediere Sistem Abonamente
-- Data: 24 Decembrie 2024
-- Scop: Dezactivare automată abonamente expirate
-- ========================================

-- 1. Creăm funcția care verifică și dezactivează abonamentele expirate
CREATE OR REPLACE FUNCTION public.deactivate_expired_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  -- Actualizează toate abonamentele expirate
  UPDATE profiles
  SET 
    subscription_status = 'expired',
    updated_at = NOW()
  WHERE subscription_status = 'active'
    AND subscription_ends_at IS NOT NULL
    AND subscription_ends_at < NOW()
    AND has_free_access = false;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  -- Logăm acțiunea dacă am afectat rânduri
  IF affected_count > 0 THEN
    INSERT INTO audit_logs (
      action_type,
      table_name,
      metadata
    ) VALUES (
      'CRON_DEACTIVATE_EXPIRED_SUBSCRIPTIONS',
      'profiles',
      jsonb_build_object(
        'affected_count', affected_count,
        'executed_at', NOW()
      )
    );
  END IF;
  
  RAISE NOTICE 'Deactivated % expired subscriptions', affected_count;
END;
$$;

-- 2. Creăm funcția care verifică accesul utilizatorului (pentru edge functions)
CREATE OR REPLACE FUNCTION public.check_user_access(p_user_id uuid)
RETURNS TABLE (
  has_access boolean,
  access_type text,
  subscription_status text,
  credits_remaining numeric,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_budget_cents INTEGER;
  v_usage_cents INTEGER;
  v_remaining_cents INTEGER;
  v_current_month TEXT;
BEGIN
  v_current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Obținem profilul utilizatorului
  SELECT 
    subscription_status,
    subscription_ends_at,
    has_free_access,
    trial_ends_at
  INTO v_profile
  FROM profiles
  WHERE id = p_user_id;
  
  -- Verifică dacă are acces gratuit
  IF v_profile.has_free_access = true THEN
    RETURN QUERY SELECT 
      true::boolean,
      'free_access'::text,
      v_profile.subscription_status,
      999.0::numeric,
      'Acces gratuit acordat'::text;
    RETURN;
  END IF;
  
  -- Verifică dacă abonamentul este activ și valid
  IF v_profile.subscription_status = 'active' AND 
     (v_profile.subscription_ends_at IS NULL OR v_profile.subscription_ends_at > NOW()) THEN
    
    -- Calculează creditele rămase
    SELECT COALESCE(monthly_budget_cents, 1000)
    INTO v_budget_cents
    FROM ai_budget_limits
    WHERE user_id = p_user_id AND is_active = true
    LIMIT 1;
    
    v_budget_cents := COALESCE(v_budget_cents, 1000);
    
    SELECT COALESCE(SUM(estimated_cost_cents), 0)
    INTO v_usage_cents
    FROM ai_usage
    WHERE user_id = p_user_id AND month_year = v_current_month;
    
    v_remaining_cents := v_budget_cents - v_usage_cents;
    
    RETURN QUERY SELECT 
      true::boolean,
      'subscription'::text,
      v_profile.subscription_status,
      (v_remaining_cents / 100.0)::numeric,
      'Abonament activ'::text;
    RETURN;
  END IF;
  
  -- Verifică trial activ
  IF v_profile.trial_ends_at IS NOT NULL AND v_profile.trial_ends_at > NOW() THEN
    -- Calculează creditele de trial rămase
    SELECT 
      COALESCE(trial_credits_cents, 0) - COALESCE(trial_credits_used_cents, 0)
    INTO v_remaining_cents
    FROM ai_budget_limits
    WHERE user_id = p_user_id AND is_active = true
    LIMIT 1;
    
    v_remaining_cents := COALESCE(v_remaining_cents, 0);
    
    IF v_remaining_cents > 0 THEN
      RETURN QUERY SELECT 
        true::boolean,
        'trial'::text,
        'trial'::text,
        (v_remaining_cents / 100.0)::numeric,
        'Perioadă de trial activă'::text;
      RETURN;
    END IF;
  END IF;
  
  -- Fără acces
  RETURN QUERY SELECT 
    false::boolean,
    'none'::text,
    COALESCE(v_profile.subscription_status, 'none'),
    0.0::numeric,
    'Fără abonament activ sau trial'::text;
END;
$$;

-- 3. Programăm cron job pentru verificare zilnică (02:00 AM)
SELECT cron.schedule(
  'deactivate-expired-subscriptions-daily',
  '0 2 * * *',
  'SELECT public.deactivate_expired_subscriptions()'
);

-- 4. REMEDIERE IMEDIATĂ: Dezactivăm abonamentele deja expirate
UPDATE profiles
SET 
  subscription_status = 'expired',
  updated_at = NOW()
WHERE subscription_status = 'active'
  AND subscription_ends_at IS NOT NULL
  AND subscription_ends_at < NOW()
  AND has_free_access = false;

-- 5. Logăm remedierea inițială
INSERT INTO audit_logs (
  action_type,
  table_name,
  metadata
) VALUES (
  'MIGRATION_FIX_EXPIRED_SUBSCRIPTIONS',
  'profiles',
  jsonb_build_object(
    'description', 'Remediere inițială abonamente expirate',
    'executed_at', NOW()
  )
);

-- 6. Creăm index pentru performanță pe verificările de abonament
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_check 
ON profiles(subscription_status, subscription_ends_at, has_free_access)
WHERE subscription_status = 'active';
