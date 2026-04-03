
-- 1. competitor_watches table
CREATE TABLE public.competitor_watches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  competitor_name TEXT NOT NULL,
  competitor_url TEXT NOT NULL,
  last_snapshot TEXT,
  last_checked_at TIMESTAMPTZ,
  changes_detected JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.competitor_watches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own competitor watches" ON public.competitor_watches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own competitor watches" ON public.competitor_watches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own competitor watches" ON public.competitor_watches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own competitor watches" ON public.competitor_watches FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_competitor_watches_updated_at BEFORE UPDATE ON public.competitor_watches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. grant_opportunities table
CREATE TABLE public.grant_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source_url TEXT,
  deadline TIMESTAMPTZ,
  funding_amount TEXT,
  relevance_score NUMERIC DEFAULT 0,
  industry TEXT,
  is_notified BOOLEAN DEFAULT false,
  search_query TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.grant_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own grants" ON public.grant_opportunities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own grants" ON public.grant_opportunities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own grants" ON public.grant_opportunities FOR DELETE USING (auth.uid() = user_id);

-- 3. memory_relationships table (graph memory)
CREATE TABLE public.memory_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object_value TEXT NOT NULL,
  confidence NUMERIC DEFAULT 0.5,
  source_conversation_id TEXT,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.memory_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memory relationships" ON public.memory_relationships FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own memory relationships" ON public.memory_relationships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memory relationships" ON public.memory_relationships FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_memory_relationships_user ON public.memory_relationships(user_id);
CREATE INDEX idx_memory_relationships_subject ON public.memory_relationships(subject);

-- 4. Add confirmation_status to yana_action_items
ALTER TABLE public.yana_action_items ADD COLUMN IF NOT EXISTS confirmation_status TEXT DEFAULT 'none';

-- 5. Add temporal columns to yana_semantic_memory
ALTER TABLE public.yana_semantic_memory ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.yana_semantic_memory ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;
