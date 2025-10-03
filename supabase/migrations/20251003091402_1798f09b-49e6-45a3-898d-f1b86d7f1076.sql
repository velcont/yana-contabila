-- Șterge tabele și funcții existente dacă există
DROP TRIGGER IF EXISTS trigger_generate_insights ON public.analyses;
DROP FUNCTION IF EXISTS public.generate_proactive_insights();
DROP TABLE IF EXISTS public.chat_insights CASCADE;
DROP TABLE IF EXISTS public.conversation_history CASCADE;

-- Tabel pentru istoricul conversațiilor (memorie chat)
CREATE TABLE public.conversation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pentru căutări rapide
CREATE INDEX idx_conversation_history_user_id ON public.conversation_history(user_id);
CREATE INDEX idx_conversation_history_conversation_id ON public.conversation_history(conversation_id);
CREATE INDEX idx_conversation_history_created_at ON public.conversation_history(created_at DESC);

-- RLS pentru conversation_history
ALTER TABLE public.conversation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON public.conversation_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON public.conversation_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Tabel pentru insights proactivi
CREATE TABLE public.chat_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pentru insights
CREATE INDEX idx_chat_insights_user_id ON public.chat_insights(user_id);
CREATE INDEX idx_chat_insights_is_read ON public.chat_insights(is_read);
CREATE INDEX idx_chat_insights_created_at ON public.chat_insights(created_at DESC);

-- RLS pentru chat_insights
ALTER TABLE public.chat_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights"
  ON public.chat_insights
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
  ON public.chat_insights
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Funcție pentru generare automată insights
CREATE OR REPLACE FUNCTION public.generate_proactive_insights()
RETURNS TRIGGER AS $$
DECLARE
  indicators JSONB;
  dso_value NUMERIC;
  ebitda_value NUMERIC;
  profit_value NUMERIC;
BEGIN
  -- Extrage indicatori din metadata
  indicators := NEW.metadata;
  
  -- Verifică DSO ridicat
  IF indicators ? 'dso' THEN
    dso_value := (indicators->>'dso')::NUMERIC;
    IF dso_value > 60 THEN
      INSERT INTO public.chat_insights (user_id, insight_type, title, description, severity, analysis_id, metadata)
      VALUES (
        NEW.user_id,
        'high_dso',
        'DSO Ridicat Detectat',
        'DSO-ul tău de ' || dso_value || ' zile depășește pragul recomandat. Banii sunt blocați în creanțe.',
        'warning',
        NEW.id,
        jsonb_build_object('dso', dso_value, 'threshold', 60)
      );
    END IF;
  END IF;
  
  -- Verifică EBITDA negativ
  IF indicators ? 'ebitda' THEN
    ebitda_value := (indicators->>'ebitda')::NUMERIC;
    IF ebitda_value < 0 THEN
      INSERT INTO public.chat_insights (user_id, insight_type, title, description, severity, analysis_id, metadata)
      VALUES (
        NEW.user_id,
        'negative_ebitda',
        'EBITDA Negativ - Pierderi Operaționale',
        'EBITDA-ul negativ de ' || ebitda_value || ' RON indică pierderi la nivel operațional.',
        'critical',
        NEW.id,
        jsonb_build_object('ebitda', ebitda_value)
      );
    END IF;
  END IF;
  
  -- Verifică profit negativ
  IF indicators ? 'profit' THEN
    profit_value := (indicators->>'profit')::NUMERIC;
    IF profit_value < 0 THEN
      INSERT INTO public.chat_insights (user_id, insight_type, title, description, severity, analysis_id, metadata)
      VALUES (
        NEW.user_id,
        'negative_profit',
        'Profit Negativ Detectat',
        'Pierderile de ' || ABS(profit_value) || ' RON necesită atenție urgentă.',
        'critical',
        NEW.id,
        jsonb_build_object('profit', profit_value)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger pentru generare automată insights
CREATE TRIGGER trigger_generate_insights
  AFTER INSERT ON public.analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_proactive_insights();