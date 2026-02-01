-- Adaug politică publică pentru citirea versiunilor publicate
-- Aceasta permite utilizatorilor neautentificați să vadă versiunea curentă
CREATE POLICY "Public can view published updates" 
ON public.app_updates 
FOR SELECT 
TO public
USING (status = 'published');