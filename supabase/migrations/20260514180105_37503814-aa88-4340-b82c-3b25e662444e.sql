
-- Self-modification audit log
CREATE TABLE public.yana_self_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_source TEXT NOT NULL, -- 'gap', 'manual', 'evaluator', 'monitor'
  trigger_ref TEXT, -- gap_id, message_id etc
  rationale TEXT NOT NULL,
  files_changed JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{path, action, sha_before}]
  diff_summary TEXT,
  branch_name TEXT,
  pr_number INTEGER,
  pr_url TEXT,
  status TEXT NOT NULL DEFAULT 'proposed', -- proposed, build_pending, build_ok, build_failed, merged, deployed, monitoring, reverted, killed
  build_status TEXT,
  error_rate_baseline NUMERIC,
  error_rate_post NUMERIC,
  rolled_back_pr INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  merged_at TIMESTAMPTZ,
  monitored_until TIMESTAMPTZ
);

ALTER TABLE public.yana_self_modifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view self modifications"
  ON public.yana_self_modifications FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages self modifications"
  ON public.yana_self_modifications FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX idx_self_mod_status ON public.yana_self_modifications(status, created_at DESC);

-- Settings / kill switch
CREATE TABLE public.yana_self_mod_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  kill_switch BOOLEAN NOT NULL DEFAULT true, -- starts OFF for safety
  max_per_day INTEGER NOT NULL DEFAULT 3,
  allowed_scopes TEXT[] NOT NULL DEFAULT ARRAY['supabase/functions/', 'src/components/', 'src/hooks/', 'src/utils/'],
  forbidden_paths TEXT[] NOT NULL DEFAULT ARRAY[
    'supabase/functions/yana-self-modifier/',
    'supabase/functions/yana-self-coder/',
    'supabase/functions/yana-self-evaluator/',
    'supabase/functions/yana-meta-prompt-evolver/',
    'supabase/functions/yana-prompt-ab-tester/',
    'supabase/functions/yana-model-router-tuner/',
    'supabase/config.toml',
    '.env',
    'src/integrations/supabase/'
  ],
  allow_db_migrations BOOLEAN NOT NULL DEFAULT false,
  allow_config_changes BOOLEAN NOT NULL DEFAULT false,
  error_rate_multiplier NUMERIC NOT NULL DEFAULT 2.0,
  monitor_window_minutes INTEGER NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

INSERT INTO public.yana_self_mod_settings (id) VALUES (1);

ALTER TABLE public.yana_self_mod_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage self mod settings"
  ON public.yana_self_mod_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role reads self mod settings"
  ON public.yana_self_mod_settings FOR SELECT
  USING (auth.role() = 'service_role');
