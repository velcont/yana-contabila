
-- 1) Auto-evaluation of conversations
CREATE TABLE IF NOT EXISTS public.yana_conversation_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  user_id UUID,
  message_id UUID,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 10),
  dimensions JSONB NOT NULL DEFAULT '{}'::jsonb, -- {accuracy, empathy, completeness, action_oriented}
  weakness_summary TEXT,
  improvement_suggestion TEXT,
  gap_topic TEXT,
  evaluator_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_yce_score ON public.yana_conversation_evaluations(score);
CREATE INDEX IF NOT EXISTS idx_yce_created ON public.yana_conversation_evaluations(created_at DESC);

ALTER TABLE public.yana_conversation_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read evaluations" ON public.yana_conversation_evaluations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 2) Prompt A/B variants
CREATE TABLE IF NOT EXISTS public.yana_prompt_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_key TEXT NOT NULL, -- e.g. 'main_system', 'fiscal_intent'
  variant_name TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_control BOOLEAN NOT NULL DEFAULT false,
  traffic_weight NUMERIC NOT NULL DEFAULT 0.5,
  total_uses INTEGER NOT NULL DEFAULT 0,
  total_score NUMERIC NOT NULL DEFAULT 0,
  avg_score NUMERIC GENERATED ALWAYS AS (CASE WHEN total_uses>0 THEN total_score/total_uses ELSE 0 END) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ypv_key_active ON public.yana_prompt_variants(variant_key, is_active);

ALTER TABLE public.yana_prompt_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage prompt variants" ON public.yana_prompt_variants
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) Meta-prompt evolution (versioned main system prompt)
CREATE TABLE IF NOT EXISTS public.yana_meta_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number INTEGER NOT NULL,
  prompt_key TEXT NOT NULL DEFAULT 'main_system',
  prompt_text TEXT NOT NULL,
  parent_version_id UUID REFERENCES public.yana_meta_prompt_versions(id),
  generated_by TEXT NOT NULL DEFAULT 'yana-meta-prompt-evolver',
  generation_rationale TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  shadow_score NUMERIC,
  shadow_samples INTEGER NOT NULL DEFAULT 0,
  promoted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(prompt_key, version_number)
);
CREATE INDEX IF NOT EXISTS idx_ympv_active ON public.yana_meta_prompt_versions(prompt_key, is_active);

ALTER TABLE public.yana_meta_prompt_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read meta prompts" ON public.yana_meta_prompt_versions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4) Model routing stats (auto-tune model per query category)
CREATE TABLE IF NOT EXISTS public.yana_model_routing_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_category TEXT NOT NULL, -- 'fiscal', 'analysis', 'chitchat', 'document', 'crm', etc.
  model TEXT NOT NULL,
  total_calls INTEGER NOT NULL DEFAULT 0,
  total_cost_cents NUMERIC NOT NULL DEFAULT 0,
  total_latency_ms NUMERIC NOT NULL DEFAULT 0,
  total_score NUMERIC NOT NULL DEFAULT 0,
  scored_calls INTEGER NOT NULL DEFAULT 0,
  avg_score NUMERIC GENERATED ALWAYS AS (CASE WHEN scored_calls>0 THEN total_score/scored_calls ELSE 0 END) STORED,
  avg_cost_cents NUMERIC GENERATED ALWAYS AS (CASE WHEN total_calls>0 THEN total_cost_cents/total_calls ELSE 0 END) STORED,
  avg_latency_ms NUMERIC GENERATED ALWAYS AS (CASE WHEN total_calls>0 THEN total_latency_ms/total_calls ELSE 0 END) STORED,
  is_recommended BOOLEAN NOT NULL DEFAULT false,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(query_category, model)
);
CREATE INDEX IF NOT EXISTS idx_ymrs_cat ON public.yana_model_routing_stats(query_category, is_recommended);

ALTER TABLE public.yana_model_routing_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read model stats" ON public.yana_model_routing_stats
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at on prompt variants
CREATE OR REPLACE FUNCTION public.touch_prompt_variant()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_touch_prompt_variant ON public.yana_prompt_variants;
CREATE TRIGGER trg_touch_prompt_variant BEFORE UPDATE ON public.yana_prompt_variants
  FOR EACH ROW EXECUTE FUNCTION public.touch_prompt_variant();
