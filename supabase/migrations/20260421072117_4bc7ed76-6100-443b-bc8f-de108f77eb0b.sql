-- ============================================
-- YANA SELF-DEVELOPMENT ENGINE - SCHEMA
-- ============================================

-- 1. Capability Gaps (lacune detectate)
CREATE TABLE IF NOT EXISTS public.yana_capability_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gap_type TEXT NOT NULL, -- 'weak_reflection' | 'user_correction' | 'repeated_topic' | 'no_agent_for_topic'
  topic TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '{}'::jsonb, -- conversation_ids, reflection_ids, correction_ids
  frequency INTEGER DEFAULT 1,
  severity NUMERIC DEFAULT 0.5, -- 0..1
  impact_score NUMERIC GENERATED ALWAYS AS (frequency * severity) STORED,
  status TEXT DEFAULT 'open', -- open | in_progress | resolved | ignored
  resolved_by_proposal_id UUID,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_capability_gaps_status ON public.yana_capability_gaps(status, impact_score DESC);
CREATE INDEX idx_capability_gaps_topic ON public.yana_capability_gaps(topic);

-- 2. Discovery Feed (ce a găsit YANA pe internet)
CREATE TABLE IF NOT EXISTS public.yana_discovery_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- 'github' | 'arxiv' | 'huggingface' | 'producthunt'
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,
  relevance_score NUMERIC DEFAULT 0, -- 0..1, scored by AI
  matched_gap_ids UUID[] DEFAULT '{}',
  ai_evaluation TEXT, -- de ce e relevant
  status TEXT DEFAULT 'new', -- new | evaluated | used | ignored
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  evaluated_at TIMESTAMPTZ,
  UNIQUE(source, url)
);

CREATE INDEX idx_discovery_status ON public.yana_discovery_feed(status, relevance_score DESC);
CREATE INDEX idx_discovery_source ON public.yana_discovery_feed(source, discovered_at DESC);

-- 3. Self Proposals (cod auto-generat de YANA)
CREATE TABLE IF NOT EXISTS public.yana_self_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_type TEXT NOT NULL, -- 'new_agent' | 'prompt_improvement' | 'new_integration' | 'tool_addition'
  title TEXT NOT NULL,
  rationale TEXT NOT NULL, -- de ce propune YANA asta
  target_gap_ids UUID[] DEFAULT '{}',
  source_discovery_ids UUID[] DEFAULT '{}',
  generated_code TEXT, -- codul propus (agent spec, prompt nou, etc)
  generated_config JSONB DEFAULT '{}'::jsonb, -- config structurat pentru yana-agent-spawner
  estimated_impact NUMERIC DEFAULT 0.5, -- AI estimation 0..1
  baseline_success_rate NUMERIC, -- success rate înainte de deploy
  current_success_rate NUMERIC, -- success rate în timpul testării
  shadow_traffic_percent INTEGER DEFAULT 10,
  status TEXT DEFAULT 'pending_test', -- pending_test | shadow_testing | deployed | rolled_back | rejected
  deployed_agent_id UUID, -- referință la yana_generated_agents
  rejection_reason TEXT,
  created_by TEXT DEFAULT 'yana-self-coder',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  shadow_started_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ
);

CREATE INDEX idx_proposals_status ON public.yana_self_proposals(status, created_at DESC);

-- 4. Proposal Tests (metrici per propunere)
CREATE TABLE IF NOT EXISTS public.yana_proposal_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.yana_self_proposals(id) ON DELETE CASCADE,
  invocation_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_latency_ms NUMERIC DEFAULT 0,
  total_cost_cents NUMERIC DEFAULT 0,
  user_feedback_positive INTEGER DEFAULT 0,
  user_feedback_negative INTEGER DEFAULT 0,
  metrics_window_start TIMESTAMPTZ DEFAULT NOW(),
  metrics_window_end TIMESTAMPTZ,
  decision TEXT, -- 'promote' | 'rollback' | 'extend_testing'
  decision_reason TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_proposal_tests_proposal ON public.yana_proposal_tests(proposal_id, created_at DESC);

-- 5. Settings (kill switch + praguri)
CREATE TABLE IF NOT EXISTS public.yana_self_dev_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT TRUE,
  rollback_threshold_percent NUMERIC DEFAULT 5.0, -- dacă scade > 5%, rollback
  min_test_invocations INTEGER DEFAULT 20,
  max_concurrent_proposals INTEGER DEFAULT 3,
  ai_budget_cents_per_day INTEGER DEFAULT 700, -- ~7 RON/zi = ~210 RON/lună
  enabled_sources TEXT[] DEFAULT ARRAY['github','arxiv','huggingface','producthunt'],
  notify_email TEXT DEFAULT 'office@velcont.com',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

-- Insert default settings row
INSERT INTO public.yana_self_dev_settings (enabled) VALUES (TRUE) ON CONFLICT DO NOTHING;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.yana_capability_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_discovery_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_self_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_proposal_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_self_dev_settings ENABLE ROW LEVEL SECURITY;

-- Admins can read everything
CREATE POLICY "Admins read capability_gaps"
  ON public.yana_capability_gaps FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins read discovery_feed"
  ON public.yana_discovery_feed FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins read self_proposals"
  ON public.yana_self_proposals FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins read proposal_tests"
  ON public.yana_proposal_tests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins read self_dev_settings"
  ON public.yana_self_dev_settings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update settings (kill switch)
CREATE POLICY "Admins update self_dev_settings"
  ON public.yana_self_dev_settings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manually mark gap/proposal as ignored/rejected
CREATE POLICY "Admins update capability_gaps"
  ON public.yana_capability_gaps FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update self_proposals"
  ON public.yana_self_proposals FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role (edge functions with SUPABASE_SERVICE_ROLE_KEY) bypasses RLS automatically.

-- ============================================
-- HELPER FUNCTION: increment proposal test stats atomically
-- ============================================
CREATE OR REPLACE FUNCTION public.record_proposal_test_outcome(
  p_proposal_id UUID,
  p_success BOOLEAN,
  p_latency_ms INTEGER DEFAULT 0,
  p_cost_cents NUMERIC DEFAULT 0
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test_id UUID;
BEGIN
  -- Find or create active test window for this proposal
  SELECT id INTO v_test_id
  FROM public.yana_proposal_tests
  WHERE proposal_id = p_proposal_id AND decided_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_test_id IS NULL THEN
    INSERT INTO public.yana_proposal_tests(proposal_id) VALUES (p_proposal_id) RETURNING id INTO v_test_id;
  END IF;

  UPDATE public.yana_proposal_tests
  SET 
    invocation_count = invocation_count + 1,
    success_count = success_count + CASE WHEN p_success THEN 1 ELSE 0 END,
    failure_count = failure_count + CASE WHEN p_success THEN 0 ELSE 1 END,
    avg_latency_ms = ((avg_latency_ms * invocation_count) + p_latency_ms) / GREATEST(invocation_count + 1, 1),
    total_cost_cents = total_cost_cents + p_cost_cents
  WHERE id = v_test_id;
END;
$$;

-- Trigger to update updated_at on settings
CREATE OR REPLACE FUNCTION public.update_self_dev_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_self_dev_settings_updated_at
  BEFORE UPDATE ON public.yana_self_dev_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_self_dev_settings_updated_at();