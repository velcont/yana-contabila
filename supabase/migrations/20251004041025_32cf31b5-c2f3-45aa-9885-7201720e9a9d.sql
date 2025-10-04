-- Fix securitate: Activăm RLS pentru tabelul chat_patterns
ALTER TABLE public.chat_patterns ENABLE ROW LEVEL SECURITY;

-- Policy pentru citire: Toată lumea poate citi pattern-urile anonimizate
-- (acestea nu conțin date personale, doar statistici agregate)
CREATE POLICY "Everyone can read chat patterns"
ON public.chat_patterns FOR SELECT
USING (true);

-- IMPORTANT: Numai funcțiile de sistem pot insera/actualiza pattern-uri
-- (nu permitem utilizatorilor să modifice direct pattern-urile)
-- Aceasta se face automat prin trigger-uri