
CREATE TABLE public.supplier_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  supplier_name TEXT NOT NULL,
  cui TEXT,
  product_description TEXT,
  offer_price NUMERIC,
  currency TEXT DEFAULT 'RON',
  scores JSONB DEFAULT '{}'::jsonb,
  recommendation TEXT,
  confidence NUMERIC,
  market_prices JSONB DEFAULT '[]'::jsonb,
  reasoning TEXT,
  web_sources TEXT[] DEFAULT '{}',
  raw_document_text TEXT,
  extracted_bid_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.supplier_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own supplier analyses"
  ON public.supplier_analyses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own supplier analyses"
  ON public.supplier_analyses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own supplier analyses"
  ON public.supplier_analyses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_supplier_analyses_user ON public.supplier_analyses(user_id, created_at DESC);
