-- Faza 1: Adaug company_id în yana_conversations pentru memorie cross-conversații

-- 1. Adaug coloana NULLABLE cu FK și ON DELETE SET NULL
ALTER TABLE yana_conversations 
ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- 2. Creez indexuri pentru performanță
CREATE INDEX idx_yana_conv_company ON yana_conversations(company_id);
CREATE INDEX idx_yana_conv_user_company ON yana_conversations(user_id, company_id);

-- 3. Adaug comment pentru documentare
COMMENT ON COLUMN yana_conversations.company_id IS 'FK către companies, poate fi NULL pentru conversații fără firmă identificată. ON DELETE SET NULL pentru a păstra conversațiile la ștergerea firmei.';

-- 4. Migrare date existente - leg conversațiile existente la companii pe baza numelui din metadata
UPDATE yana_conversations yc
SET company_id = c.id
FROM companies c
WHERE yc.company_id IS NULL
  AND yc.user_id = c.managed_by_accountant_id
  AND yc.metadata IS NOT NULL
  AND yc.metadata->>'companyName' IS NOT NULL
  AND (
    LOWER(yc.metadata->>'companyName') ILIKE '%' || LOWER(c.company_name) || '%'
    OR LOWER(c.company_name) ILIKE '%' || LOWER(yc.metadata->>'companyName') || '%'
  );

-- 5. Actualizez funcția find_similar_conversations pentru a suporta company_id
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
    AND c.was_helpful = true
    AND c.created_at > NOW() - INTERVAL '6 months'
    AND EXISTS (
      SELECT 1 
      FROM unnest(p_question_keywords) AS keyword
      WHERE c.question ILIKE '%' || keyword || '%'
    )
  ORDER BY similarity_score DESC, c.created_at DESC
  LIMIT p_limit;
END;
$function$;