
CREATE OR REPLACE FUNCTION public.get_distinct_judete_new_companies()
RETURNS TABLE(judet text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT nc.judet
  FROM public.new_companies nc
  WHERE nc.judet IS NOT NULL AND nc.judet <> ''
  ORDER BY nc.judet ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_distinct_judete_new_companies() TO authenticated;
