
-- 1. Autonomy settings per user
CREATE TABLE public.yana_autonomy_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  autonomy_level INTEGER NOT NULL DEFAULT 50 CHECK (autonomy_level BETWEEN 0 AND 100),
  max_auto_spend_cents INTEGER NOT NULL DEFAULT 10000,
  categories JSONB NOT NULL DEFAULT '{"financial": 30, "communication": 60, "planning": 80, "research": 90}'::jsonb,
  default_tone TEXT NOT NULL DEFAULT 'adaptive',
  require_confirm_for JSONB NOT NULL DEFAULT '["payment", "delete", "send_email_external", "legal_document"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.yana_autonomy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own autonomy settings"
ON public.yana_autonomy_settings FOR ALL
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_yana_autonomy_settings_updated_at
BEFORE UPDATE ON public.yana_autonomy_settings
FOR EACH ROW EXECUTE FUNCTION public.update_yana_updated_at();

-- 2. Future simulations
CREATE TABLE public.yana_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  scenarios JSONB NOT NULL DEFAULT '[]'::jsonb,
  chosen_scenario_index INTEGER,
  reasoning TEXT,
  horizon_days INTEGER NOT NULL DEFAULT 30,
  outcome_recorded JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.yana_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own simulations"
ON public.yana_simulations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own simulations"
ON public.yana_simulations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages simulations"
ON public.yana_simulations FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE INDEX idx_yana_simulations_user ON public.yana_simulations(user_id, created_at DESC);

-- 3. Risk decisions log (for learning user tolerance)
CREATE TABLE public.yana_risk_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_category TEXT NOT NULL,
  amount_cents INTEGER DEFAULT 0,
  risk_score INTEGER NOT NULL DEFAULT 50 CHECK (risk_score BETWEEN 0 AND 100),
  auto_executed BOOLEAN NOT NULL DEFAULT false,
  user_decision TEXT CHECK (user_decision IN ('approved', 'rejected', 'modified', 'pending', NULL)),
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

ALTER TABLE public.yana_risk_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own risk decisions"
ON public.yana_risk_decisions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own risk decisions"
ON public.yana_risk_decisions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role manages risk decisions"
ON public.yana_risk_decisions FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE INDEX idx_yana_risk_decisions_user ON public.yana_risk_decisions(user_id, created_at DESC);
CREATE INDEX idx_yana_risk_decisions_pending ON public.yana_risk_decisions(user_id, user_decision) WHERE user_decision = 'pending';

-- 4. Action verifications
CREATE TABLE public.yana_action_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_id TEXT NOT NULL,
  action_name TEXT NOT NULL,
  agent_name TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  result JSONB DEFAULT '{}'::jsonb,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.yana_action_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own verifications"
ON public.yana_action_verifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages verifications"
ON public.yana_action_verifications FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE INDEX idx_yana_action_verifications_user ON public.yana_action_verifications(user_id, verified_at DESC);

-- 5. Extend yana_intentions for goal tree
ALTER TABLE public.yana_intentions
  ADD COLUMN IF NOT EXISTS parent_goal_id UUID REFERENCES public.yana_intentions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS progress_pct INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_execute BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sub_tasks JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_yana_intentions_parent ON public.yana_intentions(parent_goal_id);
CREATE INDEX IF NOT EXISTS idx_yana_intentions_next_action ON public.yana_intentions(next_action_at) WHERE status = 'active' AND next_action_at IS NOT NULL;

-- 6. Helper function: get or create autonomy settings
CREATE OR REPLACE FUNCTION public.get_or_create_autonomy_settings(p_user_id UUID)
RETURNS public.yana_autonomy_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.yana_autonomy_settings;
BEGIN
  SELECT * INTO v_settings FROM public.yana_autonomy_settings WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.yana_autonomy_settings (user_id) VALUES (p_user_id) RETURNING * INTO v_settings;
  END IF;
  RETURN v_settings;
END;
$$;

-- 7. Enable realtime on activity feed tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.yana_risk_decisions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.yana_action_verifications;
