-- FAZA 1: AI LEARNING SCHEMA - STRUCTURA DE DATE COMPLETĂ

-- ============================================================================
-- 1. TABEL PRINCIPAL: ai_conversations
-- Salvează fiecare conversație pentru învățare viitoare
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificatori
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Conținutul conversației
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  
  -- Context conversație (JSONB pentru flexibilitate)
  context JSONB DEFAULT '{}'::jsonb,
  
  -- Feedback utilizator
  was_helpful BOOLEAN,
  user_feedback TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  
  -- Metadata tehnică
  conversation_duration_seconds INTEGER,
  tokens_used INTEGER,
  model_used TEXT DEFAULT 'google/gemini-2.5-flash',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index-uri pentru performanță
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_company ON public.ai_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_conversations_helpful ON public.ai_conversations(was_helpful) WHERE was_helpful = true;
CREATE INDEX IF NOT EXISTS idx_conversations_created ON public.ai_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_context ON public.ai_conversations USING gin(context);

COMMENT ON TABLE public.ai_conversations IS 'Salvează toate conversațiile AI pentru învățare continuă';

-- ============================================================================
-- 2. TABEL: ai_learned_patterns
-- Pattern-uri detectate automat din conversații
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_learned_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tipul și identificarea pattern-ului
  pattern_type TEXT NOT NULL,
  pattern_key TEXT NOT NULL,
  pattern_description TEXT NOT NULL,
  
  -- Context pattern (la ce se aplică)
  applies_to_company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  applies_to_industry TEXT,
  applies_to_company_size TEXT,
  
  -- Datele pattern-ului
  example_questions TEXT[],
  suggested_answer_template TEXT,
  related_context JSONB DEFAULT '{}'::jsonb,
  
  -- Confidence și validare
  confidence_score FLOAT DEFAULT 0.5 CHECK (confidence_score BETWEEN 0 AND 1),
  times_validated INTEGER DEFAULT 1,
  times_used INTEGER DEFAULT 0,
  
  -- Timestamps
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index-uri
CREATE INDEX IF NOT EXISTS idx_patterns_company ON public.ai_learned_patterns(applies_to_company_id);
CREATE INDEX IF NOT EXISTS idx_patterns_type ON public.ai_learned_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON public.ai_learned_patterns(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_key ON public.ai_learned_patterns(pattern_key);

COMMENT ON TABLE public.ai_learned_patterns IS 'Pattern-uri învățate automat din conversații frecvente';

-- ============================================================================
-- 3. TABEL: ai_response_feedback
-- Feedback granular pe răspunsuri specifice
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_response_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE NOT NULL,
  
  -- Feedback granular
  response_segment TEXT,
  feedback_type TEXT NOT NULL,
  
  user_comment TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  
  -- Ce a lipsit sau ce trebuia îmbunătățit
  missing_information TEXT,
  suggested_improvement TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index-uri
CREATE INDEX IF NOT EXISTS idx_feedback_conversation ON public.ai_response_feedback(conversation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.ai_response_feedback(feedback_type);

COMMENT ON TABLE public.ai_response_feedback IS 'Feedback detaliat pentru îmbunătățirea răspunsurilor AI';

-- ============================================================================
-- 4. TABEL: ai_company_preferences
-- Preferințe învățate per companie
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_company_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  
  -- Tipul preferinței
  preference_type TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  
  confidence FLOAT DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  examples_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  UNIQUE(company_id, preference_type)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_preferences_company ON public.ai_company_preferences(company_id);

COMMENT ON TABLE public.ai_company_preferences IS 'Preferințe de răspuns învățate pentru fiecare companie';

-- ============================================================================
-- 5. RLS (Row Level Security) - SECURITATE
-- ============================================================================

-- ai_conversations
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON public.ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON public.ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON public.ai_conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- ai_learned_patterns
ALTER TABLE public.ai_learned_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view patterns"
  ON public.ai_learned_patterns FOR SELECT
  USING (true);

CREATE POLICY "Service can manage patterns"
  ON public.ai_learned_patterns FOR ALL
  USING (true)
  WITH CHECK (true);

-- ai_response_feedback
ALTER TABLE public.ai_response_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
  ON public.ai_response_feedback FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own feedback"
  ON public.ai_response_feedback FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid()
    )
  );

-- ai_company_preferences
ALTER TABLE public.ai_company_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company preferences"
  ON public.ai_company_preferences FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service can manage preferences"
  ON public.ai_company_preferences FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 6. FUNCȚIE: find_similar_conversations
-- Caută conversații similare bazat pe keywords
-- ============================================================================
CREATE OR REPLACE FUNCTION public.find_similar_conversations(
  p_company_id UUID,
  p_question_keywords TEXT[],
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  question TEXT,
  answer TEXT,
  context JSONB,
  was_helpful BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  similarity_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.question,
    c.answer,
    c.context,
    c.was_helpful,
    c.created_at,
    -- Calculăm similaritate simplă bazată pe keywords comune
    (
      SELECT COUNT(*)::FLOAT 
      FROM unnest(p_question_keywords) AS keyword
      WHERE c.question ILIKE '%' || keyword || '%'
    ) / NULLIF(array_length(p_question_keywords, 1), 0) AS similarity_score
  FROM ai_conversations c
  WHERE 
    c.company_id = p_company_id
    AND c.was_helpful = true
    AND EXISTS (
      SELECT 1 
      FROM unnest(p_question_keywords) AS keyword
      WHERE c.question ILIKE '%' || keyword || '%'
    )
  ORDER BY similarity_score DESC, c.created_at DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.find_similar_conversations IS 'Găsește conversații similare bazat pe keywords pentru context învățat';

-- ============================================================================
-- 7. TRIGGER: update_updated_at
-- Actualizează automat coloana updated_at
-- ============================================================================
CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_learned_patterns_updated_at
  BEFORE UPDATE ON public.ai_learned_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_company_preferences_updated_at
  BEFORE UPDATE ON public.ai_company_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 8. REALTIME - Activare pentru sincronizare live
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_learned_patterns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_response_feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_company_preferences;

-- ============================================================================
-- VERIFICARE FINALĂ
-- ============================================================================
SELECT 'AI Learning Schema created successfully! 🧠' AS status;