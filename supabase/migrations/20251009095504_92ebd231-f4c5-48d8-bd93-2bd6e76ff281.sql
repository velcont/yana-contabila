-- Remove all public/authenticated access to sensitive tables
-- Only service role and edge functions should access these

-- 1. Remove all SELECT policies from chat_cache (will be accessed only via service role/edge functions)
DROP POLICY IF EXISTS "Users can read own cache entries" ON public.chat_cache;
DROP POLICY IF EXISTS "Everyone can read cache" ON public.chat_cache;

-- Chat cache remains with only service role policies (insert/update)

-- 2. Remove public access from chat_patterns (only admins should see patterns)
DROP POLICY IF EXISTS "Authenticated users can read chat patterns" ON public.chat_patterns;
DROP POLICY IF EXISTS "Everyone can read chat patterns" ON public.chat_patterns;

CREATE POLICY "Only admins can read chat patterns"
ON public.chat_patterns
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 3. Remove public access from analytics (only admins)
DROP POLICY IF EXISTS "Authenticated users can read analytics" ON public.chat_analytics;
DROP POLICY IF EXISTS "Everyone can read analytics" ON public.chat_analytics;

CREATE POLICY "Only admins can read analytics"
ON public.chat_analytics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- 4. Restrict knowledge_base to authenticated users only
DROP POLICY IF EXISTS "Everyone can read knowledge base" ON public.knowledge_base;

CREATE POLICY "Authenticated users can read knowledge base"
ON public.knowledge_base
FOR SELECT
TO authenticated
USING (is_active = true);