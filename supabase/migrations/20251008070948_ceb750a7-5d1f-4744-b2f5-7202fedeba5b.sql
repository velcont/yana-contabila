-- Adaugă politică RLS pentru ca admin să poată șterge orice analiză
-- IMPORTANT: Politica existentă pentru utilizatori rămâne neschimbată!
CREATE POLICY "Admins can delete all analyses"
ON public.analyses
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));