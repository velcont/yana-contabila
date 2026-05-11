
-- 1. FIX: politici RLS permisive deschise rolului public (oricine poate scrie)
DROP POLICY IF EXISTS "Service role can insert executions" ON public.yana_agent_executions;
CREATE POLICY "Service role can insert executions"
  ON public.yana_agent_executions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service can manage dreams" ON public.yana_dreams;
CREATE POLICY "Service can manage dreams"
  ON public.yana_dreams
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on optimization cycles" ON public.yana_optimization_cycles;
CREATE POLICY "Service role full access on optimization cycles"
  ON public.yana_optimization_cycles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on optimizer config" ON public.yana_optimizer_config;
CREATE POLICY "Service role full access on optimizer config"
  ON public.yana_optimizer_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. FIX: tabele cu RLS activ dar fără politici (adăugăm politică explicită pentru service role)
CREATE POLICY "Service role full access briefing_rollout"
  ON public.briefing_rollout
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access chat_cache"
  ON public.chat_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access daily_briefing_data"
  ON public.daily_briefing_data
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. FIX: funcție fără search_path setat
CREATE OR REPLACE FUNCTION public.update_self_dev_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;
