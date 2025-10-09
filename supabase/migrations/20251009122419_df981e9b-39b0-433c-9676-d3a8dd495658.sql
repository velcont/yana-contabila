-- Actualizează RLS pentru knowledge_base să permită utilizatorilor să adauge conținut

-- Șterge politica veche de blocare
DROP POLICY IF EXISTS "Block anonymous access to knowledge base" ON public.knowledge_base;

-- Permite utilizatorilor autentificați să adauge în knowledge_base
CREATE POLICY "Authenticated users can insert knowledge"
ON public.knowledge_base
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permite utilizatorilor autentificați să actualizeze knowledge_base
CREATE POLICY "Authenticated users can update knowledge"
ON public.knowledge_base
FOR UPDATE
TO authenticated
USING (true);

-- Toți utilizatorii autentificați pot citi knowledge_base activ
DROP POLICY IF EXISTS "Only authenticated users can read knowledge base" ON public.knowledge_base;
CREATE POLICY "Authenticated users can read active knowledge"
ON public.knowledge_base
FOR SELECT
TO authenticated
USING (is_active = true);