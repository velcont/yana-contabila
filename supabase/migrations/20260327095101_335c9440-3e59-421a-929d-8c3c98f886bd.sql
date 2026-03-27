
-- Fix yana_journal: remove public policy, restrict to service_role
DROP POLICY IF EXISTS "Service can manage journal" ON public.yana_journal;

CREATE POLICY "Service role can manage journal"
ON public.yana_journal
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix yana_soul_core: remove public policy, restrict to service_role
DROP POLICY IF EXISTS "Soul core writable by service role" ON public.yana_soul_core;

CREATE POLICY "Service role can manage soul core"
ON public.yana_soul_core
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
