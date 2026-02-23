
-- Table: yana_optimization_cycles
CREATE TABLE public.yana_optimization_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_number SERIAL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  phase TEXT NOT NULL DEFAULT 'collect_metrics',
  metrics_snapshot JSONB DEFAULT '{}',
  bottlenecks_detected JSONB DEFAULT '[]',
  actions_taken JSONB DEFAULT '[]',
  meta_score NUMERIC DEFAULT 0,
  meta_adjustments JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'running',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.yana_optimization_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage optimization cycles"
  ON public.yana_optimization_cycles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access on optimization cycles"
  ON public.yana_optimization_cycles FOR ALL
  USING (true)
  WITH CHECK (true);

-- Table: yana_optimizer_config
CREATE TABLE public.yana_optimizer_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value NUMERIC NOT NULL,
  default_value NUMERIC NOT NULL,
  min_value NUMERIC NOT NULL,
  max_value NUMERIC NOT NULL,
  last_adjusted_by_cycle INTEGER DEFAULT 0,
  adjustment_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.yana_optimizer_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage optimizer config"
  ON public.yana_optimizer_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access on optimizer config"
  ON public.yana_optimizer_config FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_yana_optimizer_config_updated_at
  BEFORE UPDATE ON public.yana_optimizer_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial config values
INSERT INTO public.yana_optimizer_config (config_key, config_value, default_value, min_value, max_value) VALUES
  ('quality_threshold', 6.0, 6.0, 3.0, 9.0),
  ('cost_threshold_cents', 50, 50, 10, 200),
  ('cache_min_hit_rate', 0.20, 0.20, 0.05, 0.80),
  ('latency_threshold_ms', 5000, 5000, 1000, 15000),
  ('satisfaction_threshold', 0.50, 0.50, 0.20, 0.90),
  ('auto_apply_confidence', 0.90, 0.90, 0.70, 0.99);

-- Index for fast cycle lookups
CREATE INDEX idx_optimization_cycles_status ON public.yana_optimization_cycles(status);
CREATE INDEX idx_optimization_cycles_cycle_number ON public.yana_optimization_cycles(cycle_number DESC);
