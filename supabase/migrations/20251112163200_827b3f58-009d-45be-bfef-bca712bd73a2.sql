-- Tabelă cache pentru validări AI și strategii (reduce costuri prin reutilizare)
CREATE TABLE IF NOT EXISTS public.ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  cache_type TEXT NOT NULL CHECK (cache_type IN ('validation', 'strategy', 'facts')),
  request_hash TEXT NOT NULL,
  response_data JSONB NOT NULL,
  model_used TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  cost_cents INTEGER DEFAULT 0,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days')
);

-- Index pentru căutare rapidă
CREATE INDEX idx_ai_cache_key ON public.ai_response_cache(cache_key);
CREATE INDEX idx_ai_cache_expires ON public.ai_response_cache(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_ai_cache_type ON public.ai_response_cache(cache_type);

-- Auto-cleanup cache expirat
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_response_cache
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cache is accessible by system only"
  ON public.ai_response_cache
  FOR ALL
  USING (true);

-- Tabelă pentru batch processing queue
CREATE TABLE IF NOT EXISTS public.ai_batch_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  message TEXT NOT NULL,
  batch_id UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  priority INTEGER DEFAULT 5,
  similarity_hash TEXT,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_batch_queue_status ON public.ai_batch_queue(status, priority);
CREATE INDEX idx_batch_queue_similarity ON public.ai_batch_queue(similarity_hash) WHERE similarity_hash IS NOT NULL;
CREATE INDEX idx_batch_queue_user ON public.ai_batch_queue(user_id);

ALTER TABLE public.ai_batch_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own queue items"
  ON public.ai_batch_queue
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage queue"
  ON public.ai_batch_queue
  FOR ALL
  USING (true);

COMMENT ON TABLE public.ai_response_cache IS 'Cache pentru răspunsuri AI - reduce costuri prin reutilizare';
COMMENT ON TABLE public.ai_batch_queue IS 'Queue pentru batch processing - optimizare costuri AI';