-- Permitem edge function-urilor să scrie pattern-uri de învățare
-- Folosim service_role pentru operațiuni automate

-- Policy pentru INSERT în chat_patterns (din edge functions)
CREATE POLICY "Service role can insert chat patterns"
ON public.chat_patterns
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy pentru UPDATE în chat_patterns (din edge functions)
CREATE POLICY "Service role can update chat patterns"
ON public.chat_patterns
FOR UPDATE
TO authenticated
USING (true);

-- Similar pentru chat_cache
CREATE POLICY "Service role can insert cache"
ON public.chat_cache
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Service role can update cache"
ON public.chat_cache
FOR UPDATE
TO authenticated
USING (true);