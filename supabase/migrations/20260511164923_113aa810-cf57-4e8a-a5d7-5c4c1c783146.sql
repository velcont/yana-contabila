
-- 1. Re-programează cron-ul: la fiecare 30 minute în loc de zilnic
SELECT cron.unschedule('deactivate-expired-subscriptions-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'deactivate-expired-subscriptions-daily');

SELECT cron.schedule(
  'deactivate-expired-subscriptions-30min',
  '*/30 * * * *',
  $$SELECT public.deactivate_expired_subscriptions()$$
);

-- 2. Helper realtime: verifică dacă userul ARE acces valid CHIAR ACUM
-- (nu se bazează pe cron — recalculează la fiecare apel)
CREATE OR REPLACE FUNCTION public.is_subscription_currently_valid(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND (
        -- Admin / acces gratuit acordat manual (Velcont)
        public.has_role(p.id, 'admin'::app_role)
        OR p.has_free_access = true
        -- Trial activ
        OR (p.trial_ends_at IS NOT NULL AND p.trial_ends_at > now())
        -- Abonament Stripe activ și NEEXPIRAT
        OR (
          p.subscription_status = 'active'
          AND p.stripe_subscription_id IS NOT NULL
          AND (p.subscription_ends_at IS NULL OR p.subscription_ends_at > now())
        )
      )
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_subscription_currently_valid(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_subscription_currently_valid(uuid) TO authenticated, service_role;
