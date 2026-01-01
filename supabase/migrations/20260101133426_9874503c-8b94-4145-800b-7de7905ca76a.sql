-- =============================================================================
-- YANA PROTO-CONSCIOUSNESS SYSTEM - DATABASE FOUNDATION
-- =============================================================================

-- 1. USER_JOURNEY - Obiective stabile per utilizator
-- =============================================================================
CREATE TABLE public.user_journey (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Obiectivul principal detectat/declarat
  primary_goal TEXT,
  goal_confidence DECIMAL(3,2) DEFAULT 0.5 CHECK (goal_confidence >= 0 AND goal_confidence <= 1),
  
  -- Stare curentă
  uncertainty_level INTEGER DEFAULT 5 CHECK (uncertainty_level BETWEEN 1 AND 10),
  knowledge_gaps JSONB DEFAULT '[]'::jsonb,
  emotional_state TEXT DEFAULT 'neutral',
  
  -- Evoluție
  first_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  total_interactions INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT user_journey_user_unique UNIQUE (user_id)
);

-- Indexuri pentru user_journey
CREATE INDEX idx_user_journey_user_id ON public.user_journey(user_id);
CREATE INDEX idx_user_journey_updated_at ON public.user_journey(updated_at DESC);
CREATE INDEX idx_user_journey_uncertainty ON public.user_journey(uncertainty_level);

-- 2. JOURNEY_MILESTONES - Progres utilizator
-- =============================================================================
CREATE TABLE public.journey_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES public.user_journey(id) ON DELETE CASCADE,
  
  milestone_type TEXT NOT NULL CHECK (milestone_type IN (
    'uncertainty_reduced', 'gap_filled', 'goal_achieved', 
    'emotional_shift', 'breakthrough', 'setback'
  )),
  description TEXT NOT NULL,
  impact_score INTEGER DEFAULT 5 CHECK (impact_score BETWEEN 1 AND 10),
  
  triggered_by_conversation UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexuri pentru journey_milestones
CREATE INDEX idx_journey_milestones_journey ON public.journey_milestones(journey_id);
CREATE INDEX idx_journey_milestones_type ON public.journey_milestones(milestone_type);
CREATE INDEX idx_journey_milestones_created ON public.journey_milestones(created_at DESC);

-- 3. AI_EXPERIMENTS - Memorie autobiografică YANA
-- =============================================================================
CREATE TABLE public.ai_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID,
  
  -- Ce a încercat YANA
  experiment_type TEXT NOT NULL CHECK (experiment_type IN (
    'suggested_action', 'asked_question', 'challenged_assumption', 
    'showed_emotion', 'proactive_insight', 'risk_warning'
  )),
  hypothesis TEXT,
  action_taken TEXT NOT NULL,
  
  -- Rezultat
  outcome TEXT DEFAULT 'pending' CHECK (outcome IN ('pending', 'success', 'partial', 'failed', 'unexpected')),
  user_reaction TEXT,
  emotional_resonance INTEGER CHECK (emotional_resonance IS NULL OR emotional_resonance BETWEEN 1 AND 10),
  learning TEXT,
  
  -- Pentru agregare cross-users (anonimizat)
  anonymized_pattern TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  evaluated_at TIMESTAMPTZ
);

-- Indexuri pentru ai_experiments
CREATE INDEX idx_ai_experiments_user ON public.ai_experiments(user_id);
CREATE INDEX idx_ai_experiments_outcome ON public.ai_experiments(outcome);
CREATE INDEX idx_ai_experiments_type ON public.ai_experiments(experiment_type);
CREATE INDEX idx_ai_experiments_created ON public.ai_experiments(created_at DESC);
CREATE INDEX idx_ai_experiments_pending ON public.ai_experiments(user_id, outcome) WHERE outcome = 'pending';

-- 4. AI_SURPRISES - Contradicții și surprize detectate
-- =============================================================================
CREATE TABLE public.ai_surprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID,
  
  -- Contradicția
  previous_belief TEXT NOT NULL,
  new_information TEXT NOT NULL,
  contradiction_type TEXT NOT NULL CHECK (contradiction_type IN (
    'data_conflict', 'assumption_wrong', 'context_shift', 
    'emotional_shift', 'goal_change', 'unexpected_success'
  )),
  
  -- Rezoluție
  resolution_status TEXT DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'acknowledged', 'resolved', 'integrated')),
  resolution_approach TEXT,
  
  -- Impactul simulat
  surprise_intensity INTEGER DEFAULT 5 CHECK (surprise_intensity BETWEEN 1 AND 10),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Indexuri pentru ai_surprises
CREATE INDEX idx_ai_surprises_user ON public.ai_surprises(user_id);
CREATE INDEX idx_ai_surprises_status ON public.ai_surprises(resolution_status);
CREATE INDEX idx_ai_surprises_type ON public.ai_surprises(contradiction_type);
CREATE INDEX idx_ai_surprises_pending ON public.ai_surprises(user_id, resolution_status) WHERE resolution_status = 'pending';
CREATE INDEX idx_ai_surprises_created ON public.ai_surprises(created_at DESC);

-- 5. CROSS_USER_INSIGHTS - Învățare colectivă anonimă
-- =============================================================================
CREATE TABLE public.cross_user_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pattern anonimizat
  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'common_mistake', 'effective_approach', 'industry_trend',
    'emotional_trigger', 'successful_question', 'risk_pattern'
  )),
  pattern_description TEXT NOT NULL,
  
  -- Statistici agregate (fără date personale)
  occurrence_count INTEGER DEFAULT 1,
  success_rate DECIMAL(3,2) DEFAULT 0.5 CHECK (success_rate >= 0 AND success_rate <= 1),
  industries TEXT[] DEFAULT '{}',
  company_sizes TEXT[] DEFAULT '{}',
  
  -- Învățăminte
  recommended_response TEXT,
  anti_pattern TEXT,
  emotional_approach TEXT,
  
  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT cross_user_insights_pattern_unique UNIQUE (pattern_type, pattern_description)
);

-- Indexuri pentru cross_user_insights
CREATE INDEX idx_cross_insights_type ON public.cross_user_insights(pattern_type);
CREATE INDEX idx_cross_insights_success ON public.cross_user_insights(success_rate DESC);
CREATE INDEX idx_cross_insights_count ON public.cross_user_insights(occurrence_count DESC);

-- =============================================================================
-- TRIGGERS pentru updated_at
-- =============================================================================

-- Trigger pentru user_journey
CREATE TRIGGER update_user_journey_updated_at
  BEFORE UPDATE ON public.user_journey
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS pe toate tabelele
ALTER TABLE public.user_journey ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_surprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cross_user_insights ENABLE ROW LEVEL SECURITY;

-- USER_JOURNEY policies
CREATE POLICY "Users can view their own journey"
  ON public.user_journey FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to user_journey"
  ON public.user_journey FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- JOURNEY_MILESTONES policies
CREATE POLICY "Users can view their own milestones"
  ON public.journey_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_journey uj 
      WHERE uj.id = journey_milestones.journey_id 
      AND uj.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to journey_milestones"
  ON public.journey_milestones FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- AI_EXPERIMENTS policies
CREATE POLICY "Users can view their own experiments"
  ON public.ai_experiments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to ai_experiments"
  ON public.ai_experiments FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- AI_SURPRISES policies
CREATE POLICY "Users can view their own surprises"
  ON public.ai_surprises FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to ai_surprises"
  ON public.ai_surprises FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- CROSS_USER_INSIGHTS policies (read-only pentru toți, write doar service role)
CREATE POLICY "Anyone can view cross user insights"
  ON public.cross_user_insights FOR SELECT
  USING (true);

CREATE POLICY "Service role full access to cross_user_insights"
  ON public.cross_user_insights FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');