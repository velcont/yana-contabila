-- Drop the public access policy for fiscal_news
DROP POLICY IF EXISTS "Anyone can view fiscal news" ON public.fiscal_news;

-- Create new policy requiring authentication
CREATE POLICY "Authenticated users can view fiscal news"
ON public.fiscal_news
FOR SELECT
TO authenticated
USING (true);

-- Add helpful comment
COMMENT ON POLICY "Authenticated users can view fiscal news" ON public.fiscal_news IS 
'Restricts access to fiscal news to authenticated users only, preventing unauthorized scraping and protecting business value.';