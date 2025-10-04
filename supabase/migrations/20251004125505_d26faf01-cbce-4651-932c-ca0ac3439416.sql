-- 1. Tabelă pentru analize favorite
CREATE TABLE public.favorite_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  notes TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, analysis_id)
);

ALTER TABLE public.favorite_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON public.favorite_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own favorites"
  ON public.favorite_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favorites"
  ON public.favorite_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON public.favorite_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Tabelă pentru cache-ul de răspunsuri
CREATE TABLE public.chat_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_hash TEXT NOT NULL UNIQUE,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  hit_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.chat_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read cache"
  ON public.chat_cache FOR SELECT
  USING (expires_at > now());

-- Index pentru performanță
CREATE INDEX idx_chat_cache_hash ON public.chat_cache(question_hash);
CREATE INDEX idx_chat_cache_expires ON public.chat_cache(expires_at);

-- 3. Tabelă pentru rate limiting
CREATE TABLE public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint, window_start)
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits"
  ON public.api_rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Index pentru verificare rapidă
CREATE INDEX idx_rate_limits_user_endpoint ON public.api_rate_limits(user_id, endpoint, window_start);

-- Funcție pentru verificare rate limit (max 30 req/minut pentru chat)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 30
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_window TIMESTAMPTZ;
  current_count INTEGER;
BEGIN
  -- Rotunjește la început de minut
  current_window := date_trunc('minute', now());
  
  -- Verifică request-urile din fereastra curentă
  SELECT request_count INTO current_count
  FROM public.api_rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start = current_window;
  
  -- Dacă nu există, creează intrare nouă
  IF current_count IS NULL THEN
    INSERT INTO public.api_rate_limits (user_id, endpoint, request_count, window_start)
    VALUES (p_user_id, p_endpoint, 1, current_window);
    RETURN TRUE;
  END IF;
  
  -- Dacă limita e depășită, returnează FALSE
  IF current_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  -- Incrementează counter-ul
  UPDATE public.api_rate_limits
  SET request_count = request_count + 1
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start = current_window;
  
  RETURN TRUE;
END;
$$;

-- Funcție pentru curățare automată (rulează periodic)
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Șterge cache expirat
  DELETE FROM public.chat_cache WHERE expires_at < now();
  
  -- Șterge rate limits mai vechi de 1 oră
  DELETE FROM public.api_rate_limits WHERE window_start < (now() - interval '1 hour');
END;
$$;