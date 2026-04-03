
CREATE TABLE public.price_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_query TEXT NOT NULL,
  results JSONB DEFAULT '[]'::jsonb,
  best_price NUMERIC,
  best_source TEXT,
  currency TEXT DEFAULT 'RON',
  sources_checked INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.price_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own searches"
  ON public.price_searches FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own searches"
  ON public.price_searches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own searches"
  ON public.price_searches FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_price_searches_user ON public.price_searches(user_id, created_at DESC);
