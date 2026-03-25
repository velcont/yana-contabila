
-- Table: yana_observations (System 1: Observer data)
CREATE TABLE public.yana_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_type TEXT NOT NULL,
  source_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_conversation_id TEXT,
  raw_data JSONB NOT NULL DEFAULT '{}',
  learning_potential NUMERIC DEFAULT 0.5,
  processed BOOLEAN DEFAULT false,
  processed_by TEXT,
  processed_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: yana_brain_decisions (Metacognitive controller decisions)
CREATE TABLE public.yana_brain_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type TEXT NOT NULL,
  from_mode TEXT,
  to_mode TEXT,
  reasoning JSONB NOT NULL DEFAULT '{}',
  metrics_snapshot JSONB DEFAULT '{}',
  actions_triggered TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for yana_observations
ALTER TABLE public.yana_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all observations"
  ON public.yana_observations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert observations"
  ON public.yana_observations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS for yana_brain_decisions
ALTER TABLE public.yana_brain_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view brain decisions"
  ON public.yana_brain_decisions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert brain decisions"
  ON public.yana_brain_decisions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_observations_unprocessed ON public.yana_observations (processed, created_at) WHERE processed = false;
CREATE INDEX idx_observations_type ON public.yana_observations (observation_type, created_at);
CREATE INDEX idx_brain_decisions_created ON public.yana_brain_decisions (created_at DESC);
