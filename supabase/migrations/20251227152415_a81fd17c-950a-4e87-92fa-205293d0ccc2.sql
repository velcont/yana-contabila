-- ============================================
-- FAZA 3 + FAZA 5: Tabele pentru Daily Anchor și Documente
-- ============================================

-- 1. Tabel pentru contextul emoțional al utilizatorului (Daily Anchor)
CREATE TABLE public.user_emotional_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  detected_mood TEXT, -- 'obosit', 'anxios', 'optimist', 'confuz', 'determinat'
  mood_score INTEGER,
  main_topic TEXT, -- 'cash', 'credit', 'personal', 'concurență', 'decizie'
  topic_summary TEXT, -- "blocat cu creditul de la BRD"
  unresolved_issue BOOLEAN DEFAULT FALSE,
  next_step_suggested TEXT, -- micro-acțiunea sugerată pentru data viitoare
  mode_flow TEXT, -- 'companion_only', 'strategic_only', 'mixed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, session_date)
);

-- Adaugă constraint după creare (validare mood_score)
CREATE OR REPLACE FUNCTION validate_mood_score() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mood_score IS NOT NULL AND (NEW.mood_score < 1 OR NEW.mood_score > 5) THEN
    RAISE EXCEPTION 'mood_score must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_mood_score
  BEFORE INSERT OR UPDATE ON public.user_emotional_context
  FOR EACH ROW EXECUTE FUNCTION validate_mood_score();

-- RLS pentru user_emotional_context
ALTER TABLE public.user_emotional_context ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own emotional context" 
  ON public.user_emotional_context 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emotional context" 
  ON public.user_emotional_context 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emotional context" 
  ON public.user_emotional_context 
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. Tabel pentru documentele strategice uploadate
CREATE TABLE public.user_strategic_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT, -- 'contract_credit', 'contract_comercial', 'video_transcript', 'pdf', 'word', 'excel'
  file_size_bytes INTEGER,
  extracted_text TEXT,
  ai_summary TEXT,
  conversation_id UUID,
  metadata JSONB DEFAULT '{}',
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS pentru user_strategic_documents
ALTER TABLE public.user_strategic_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" 
  ON public.user_strategic_documents 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" 
  ON public.user_strategic_documents 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" 
  ON public.user_strategic_documents 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" 
  ON public.user_strategic_documents 
  FOR DELETE USING (auth.uid() = user_id);

-- Index pentru căutare rapidă
CREATE INDEX idx_emotional_context_user_date ON public.user_emotional_context(user_id, session_date DESC);
CREATE INDEX idx_strategic_documents_user ON public.user_strategic_documents(user_id, uploaded_at DESC);
CREATE INDEX idx_strategic_documents_conversation ON public.user_strategic_documents(conversation_id);