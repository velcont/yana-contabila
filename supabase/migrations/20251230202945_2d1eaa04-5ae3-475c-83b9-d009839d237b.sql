-- Fix BUG #2: Actualizare funcție find_similar_conversations pentru a include was_helpful IS NULL
-- Conversațiile fără feedback (NULL) sunt acum incluse, cu prioritate pentru cele cu feedback pozitiv

CREATE OR REPLACE FUNCTION public.find_similar_conversations(
  p_company_id uuid,
  p_question_keywords text[], 
  p_limit integer DEFAULT 5
)
RETURNS TABLE(
  id uuid, 
  question text, 
  answer text, 
  context jsonb, 
  was_helpful boolean, 
  created_at timestamp with time zone, 
  similarity_score double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.question,
    c.answer,
    c.context,
    c.was_helpful,
    c.created_at,
    (
      SELECT COUNT(*)::FLOAT 
      FROM unnest(p_question_keywords) AS keyword
      WHERE c.question ILIKE '%' || keyword || '%'
    ) / NULLIF(array_length(p_question_keywords, 1), 0) AS similarity_score
  FROM ai_conversations c
  WHERE 
    -- Match pe company_id - dacă e NULL, caută conversații fără firmă
    (
      (p_company_id IS NOT NULL AND c.company_id = p_company_id)
      OR (p_company_id IS NULL AND c.company_id IS NULL)
    )
    -- 🆕 FIX BUG #2: Include și conversații fără feedback (NULL) sau cu feedback pozitiv
    AND (c.was_helpful = true OR c.was_helpful IS NULL)
    -- Ignoră conversații mai vechi de 6 luni
    AND c.created_at > NOW() - INTERVAL '6 months'
    -- Cel puțin un keyword match
    AND EXISTS (
      SELECT 1 
      FROM unnest(p_question_keywords) AS keyword
      WHERE c.question ILIKE '%' || keyword || '%'
    )
  ORDER BY 
    -- Prioritizează conversațiile cu feedback pozitiv explicit
    CASE WHEN c.was_helpful = true THEN 0 ELSE 1 END,
    similarity_score DESC, 
    c.created_at DESC
  LIMIT p_limit;
END;
$function$;