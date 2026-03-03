
-- Actualizăm funcția deactivate_expired_subscriptions pentru a expira și free access
CREATE OR REPLACE FUNCTION public.deactivate_expired_subscriptions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected_count INTEGER;
  free_access_count INTEGER;
BEGIN
  -- 1. Actualizează abonamentele expirate (logica existentă)
  UPDATE profiles
  SET 
    subscription_status = 'expired',
    updated_at = NOW()
  WHERE subscription_status = 'active'
    AND subscription_ends_at IS NOT NULL
    AND subscription_ends_at < NOW()
    AND has_free_access = false;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  -- 2. NOU: Dezactivează free access expirat
  UPDATE profiles
  SET 
    has_free_access = false,
    subscription_status = 'expired',
    updated_at = NOW()
  WHERE has_free_access = true
    AND subscription_ends_at IS NOT NULL
    AND subscription_ends_at < NOW();
  
  GET DIAGNOSTICS free_access_count = ROW_COUNT;
  
  -- Logăm acțiunea dacă am afectat rânduri
  IF affected_count > 0 OR free_access_count > 0 THEN
    INSERT INTO audit_logs (
      action_type,
      table_name,
      metadata
    ) VALUES (
      'CRON_DEACTIVATE_EXPIRED_SUBSCRIPTIONS',
      'profiles',
      jsonb_build_object(
        'expired_subscriptions', affected_count,
        'expired_free_access', free_access_count,
        'executed_at', NOW()
      )
    );
  END IF;
  
  RAISE NOTICE 'Deactivated % expired subscriptions, % expired free access', affected_count, free_access_count;
END;
$function$;
