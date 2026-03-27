
-- Fix hook_signals: restrict to service_role
DROP POLICY IF EXISTS "Service can manage hook signals" ON public.hook_signals;

CREATE POLICY "Service role can manage hook signals"
ON public.hook_signals
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix trial_notifications: restrict to service_role
DROP POLICY IF EXISTS "Service can manage trial notifications" ON public.trial_notifications;

CREATE POLICY "Service role can manage trial notifications"
ON public.trial_notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix yana_client_profiles: restrict to service_role
DROP POLICY IF EXISTS "Service role full access" ON public.yana_client_profiles;

CREATE POLICY "Service role can manage client profiles"
ON public.yana_client_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
