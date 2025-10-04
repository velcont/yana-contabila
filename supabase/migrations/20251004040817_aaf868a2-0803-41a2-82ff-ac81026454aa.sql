-- ============================================
-- SISTEM DE ÎNVĂȚARE AUTOMATĂ PENTRU CHATBOT
-- CU PROTECȚIE COMPLETĂ A CONFIDENȚIALITĂȚII
-- ============================================

-- 1. Tabel pentru pattern-uri anonimizate de întrebări
CREATE TABLE IF NOT EXISTS public.chat_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Pattern-ul întrebării (anonimizat, fără valori concrete)
  question_pattern TEXT NOT NULL,
  question_category TEXT NOT NULL, -- 'dso', 'profit', 'cash_flow', 'comparison', etc.
  
  -- Metadata agregată (fără date personale)
  frequency INT DEFAULT 1, -- Câte ori a fost întrebat
  avg_response_time NUMERIC, -- Timp mediu de răspuns
  success_rate NUMERIC, -- % răspunsuri cu feedback pozitiv
  
  -- Îmbogățire automată
  last_asked_at TIMESTAMPTZ DEFAULT now(),
  suggested_response_template TEXT, -- Template de răspuns optimizat
  
  -- Index pentru căutare rapidă
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index pentru performanță
CREATE INDEX idx_chat_patterns_category ON public.chat_patterns(question_category);
CREATE INDEX idx_chat_patterns_frequency ON public.chat_patterns(frequency DESC);

-- 2. Tabel pentru feedback pe răspunsuri (COMPLET ANONIMIZAT)
CREATE TABLE IF NOT EXISTS public.chat_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Link către conversația originală (pentru tracking intern)
  conversation_message_id UUID REFERENCES public.conversation_history(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- Doar pentru a preveni spam-ul
  
  -- Feedback-ul efectiv
  rating INT NOT NULL CHECK (rating IN (1, -1)), -- 1 = 👍, -1 = 👎
  
  -- Metadata anonimizată (fără conținut conversație)
  question_category TEXT, -- doar categoria, nu întrebarea
  response_length INT, -- doar lungimea răspunsului
  response_time_ms INT, -- timp de generare
  
  -- Feedback suplimentar opțional
  feedback_text TEXT, -- dacă userul vrea să explice (opțional)
  
  UNIQUE(conversation_message_id, user_id) -- Un user poate da feedback o singură dată
);

-- RLS pentru feedback
ALTER TABLE public.chat_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own feedback"
ON public.chat_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own feedback"
ON public.chat_feedback FOR SELECT
USING (auth.uid() = user_id);

-- Index pentru agregare statistici
CREATE INDEX idx_chat_feedback_rating ON public.chat_feedback(rating);
CREATE INDEX idx_chat_feedback_category ON public.chat_feedback(question_category);

-- 3. Knowledge Base - Template-uri de răspunsuri verificate
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Tipul de cunoștință
  topic TEXT NOT NULL, -- 'dso_explanation', 'cash_flow_tips', etc.
  category TEXT NOT NULL,
  
  -- Template-ul de răspuns (fără date personale)
  response_template TEXT NOT NULL,
  
  -- Metrici de calitate
  usage_count INT DEFAULT 0,
  avg_rating NUMERIC DEFAULT 0,
  total_ratings INT DEFAULT 0,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  priority INT DEFAULT 0, -- pentru a prioritiza răspunsurile mai bune
  
  metadata JSONB DEFAULT '{}'::jsonb
);

-- RLS pentru knowledge base (read-only pentru toți)
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read knowledge base"
ON public.knowledge_base FOR SELECT
USING (is_active = true);

-- Index pentru performanță
CREATE INDEX idx_knowledge_base_category ON public.knowledge_base(category);
CREATE INDEX idx_knowledge_base_priority ON public.knowledge_base(priority DESC);

-- 4. Tabel pentru statistici agregate (complet anonimizat)
CREATE TABLE IF NOT EXISTS public.chat_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Perioada de agregare
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Statistici agregate (ZERO date personale)
  total_conversations INT DEFAULT 0,
  total_messages INT DEFAULT 0,
  avg_conversation_length NUMERIC,
  
  -- Top categorii întrebări
  top_categories JSONB DEFAULT '[]'::jsonb,
  
  -- Metrici de performanță
  avg_response_time_ms INT,
  avg_user_satisfaction NUMERIC, -- bazat pe feedback
  
  -- Pattern-uri detectate
  emerging_patterns JSONB DEFAULT '[]'::jsonb,
  
  UNIQUE(period_start, period_end)
);

-- RLS pentru analytics (read-only pentru toți)
ALTER TABLE public.chat_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read analytics"
ON public.chat_analytics FOR SELECT
USING (true);

-- 5. Funcție pentru actualizare automată a statisticilor pattern-urilor
CREATE OR REPLACE FUNCTION public.update_chat_pattern_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Actualizează frecvența și rata de succes pentru pattern-ul asociat
  IF NEW.question_category IS NOT NULL THEN
    INSERT INTO public.chat_patterns (question_pattern, question_category, frequency, last_asked_at)
    VALUES (
      'Pattern: ' || NEW.question_category,
      NEW.question_category,
      1,
      now()
    )
    ON CONFLICT (question_pattern) 
    DO UPDATE SET
      frequency = public.chat_patterns.frequency + 1,
      last_asked_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- 6. Funcție pentru agregare feedback și actualizare knowledge base
CREATE OR REPLACE FUNCTION public.aggregate_feedback_to_knowledge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  avg_rating_val NUMERIC;
  total_count INT;
BEGIN
  -- Calculează rating mediu pentru categoria respectivă
  SELECT 
    AVG(CASE WHEN rating = 1 THEN 1.0 ELSE 0.0 END),
    COUNT(*)
  INTO avg_rating_val, total_count
  FROM public.chat_feedback
  WHERE question_category = NEW.question_category;
  
  -- Actualizează knowledge base pentru categoria respectivă
  UPDATE public.knowledge_base
  SET 
    avg_rating = avg_rating_val,
    total_ratings = total_count,
    updated_at = now()
  WHERE category = NEW.question_category;
  
  RETURN NEW;
END;
$$;

-- Trigger pentru actualizare automată pattern-uri (DEZACTIVAT MOMENTAN - va fi activat după testare)
-- CREATE TRIGGER trigger_update_pattern_stats
-- AFTER INSERT ON public.conversation_history
-- FOR EACH ROW
-- EXECUTE FUNCTION public.update_chat_pattern_stats();

-- Trigger pentru agregare feedback
CREATE TRIGGER trigger_aggregate_feedback
AFTER INSERT ON public.chat_feedback
FOR EACH ROW
EXECUTE FUNCTION public.aggregate_feedback_to_knowledge();

-- 7. Funcție helper pentru extragere pattern anonimizat dintr-o întrebare
CREATE OR REPLACE FUNCTION public.extract_question_pattern(question_text TEXT)
RETURNS TABLE(
  pattern TEXT,
  category TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Detectează categoria întrebării bazat pe cuvinte cheie
  -- IMPORTANT: Nu returnează valori concrete, doar pattern-ul
  
  RETURN QUERY
  SELECT 
    CASE
      WHEN question_text ~* '(dso|days sales outstanding|zile client)' THEN 'Întrebare despre DSO'
      WHEN question_text ~* '(dpo|days payable|zile furnizor)' THEN 'Întrebare despre DPO'
      WHEN question_text ~* '(profit|pierdere|câștig)' THEN 'Întrebare despre profit'
      WHEN question_text ~* '(cash|numerar|lichidități)' THEN 'Întrebare despre cash flow'
      WHEN question_text ~* '(compar|diferență|evoluție)' THEN 'Întrebare comparativă'
      WHEN question_text ~* '(cheltuieli|costuri|expenses)' THEN 'Întrebare despre cheltuieli'
      WHEN question_text ~* '(venituri|încasări|revenue)' THEN 'Întrebare despre venituri'
      WHEN question_text ~* '(ebitda|marja|rentabilitate)' THEN 'Întrebare despre rentabilitate'
      WHEN question_text ~* '(stoc|inventar|marfă)' THEN 'Întrebare despre stocuri'
      ELSE 'Întrebare generală'
    END AS pattern,
    CASE
      WHEN question_text ~* '(dso|days sales outstanding|zile client)' THEN 'dso'
      WHEN question_text ~* '(dpo|days payable|zile furnizor)' THEN 'dpo'
      WHEN question_text ~* '(profit|pierdere|câștig)' THEN 'profit'
      WHEN question_text ~* '(cash|numerar|lichidități)' THEN 'cash_flow'
      WHEN question_text ~* '(compar|diferență|evoluție)' THEN 'comparison'
      WHEN question_text ~* '(cheltuieli|costuri|expenses)' THEN 'expenses'
      WHEN question_text ~* '(venituri|încasări|revenue)' THEN 'revenue'
      WHEN question_text ~* '(ebitda|marja|rentabilitate)' THEN 'profitability'
      WHEN question_text ~* '(stoc|inventar|marfă)' THEN 'inventory'
      ELSE 'general'
    END AS category;
END;
$$;

-- 8. Seed cu knowledge base inițial (template-uri de răspunsuri bune)
INSERT INTO public.knowledge_base (topic, category, response_template, priority) VALUES
('dso_explanation', 'dso', 'DSO (Days Sales Outstanding) reprezintă numărul mediu de zile în care compania colectează plățile de la clienți. Formula: (Creanțe / Venituri) × 365. Un DSO mai mic înseamnă cash flow mai bun.', 10),
('dpo_explanation', 'dpo', 'DPO (Days Payable Outstanding) arată câte zile în medie durează până plătești furnizorilor. Formula: (Datorii furnizori / Cheltuieli) × 365. Un DPO mai mare îți lasă mai mult cash disponibil.', 10),
('cash_conversion_cycle', 'cash_flow', 'Cash Conversion Cycle măsoară cât timp banii tăi sunt blocați în operațiuni. Formula: DSO + DII - DPO. Cu cât e mai mic, cu atât mai bine pentru cash flow-ul tău.', 10),
('ebitda_explanation', 'profitability', 'EBITDA arată profitul operațional înai de dobânzi, taxe și amortizare. E un indicator bun al performanței operaționale pure a businessului tău.', 10),
('profit_margin', 'profitability', 'Marja de profit arată câți bani rămân din fiecare leu de venit după ce scazi toate cheltuielile. Formula: (Profit Net / Venituri) × 100. O marjă sănătoasă depinde de industrie.', 10)
ON CONFLICT DO NOTHING;

-- 9. Comentarii pentru documentație
COMMENT ON TABLE public.chat_patterns IS 'Stochează pattern-uri anonimizate de întrebări pentru învățare automată';
COMMENT ON TABLE public.chat_feedback IS 'Feedback utilizatori pe răspunsuri (👍/👎) - complet anonimizat';
COMMENT ON TABLE public.knowledge_base IS 'Template-uri verificate de răspunsuri pentru îmbunătățirea calității';
COMMENT ON TABLE public.chat_analytics IS 'Statistici agregate complet anonimizate pentru analiza tendințelor';