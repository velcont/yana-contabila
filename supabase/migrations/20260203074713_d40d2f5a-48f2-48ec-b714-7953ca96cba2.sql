-- ============================================================================
-- SISTEMUL AGENTIC YANA V2 - ARHITECTURĂ COMPLETĂ (FIX)
-- ============================================================================

-- 1. USER BEHAVIOR TRACKING
CREATE TABLE IF NOT EXISTS public.yana_user_behavior (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id TEXT,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    page_context TEXT,
    time_spent_seconds INTEGER DEFAULT 0,
    interaction_depth INTEGER DEFAULT 0,
    emotional_state TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_behavior_user_session 
ON public.yana_user_behavior(user_id, session_id, created_at DESC);

-- 2. QUESTION CLUSTERING
CREATE TABLE IF NOT EXISTS public.yana_question_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cluster_name TEXT NOT NULL,
    cluster_description TEXT,
    centroid_embedding JSONB,
    sample_questions TEXT[] DEFAULT '{}',
    question_count INTEGER DEFAULT 0,
    avg_satisfaction DECIMAL(5,4) DEFAULT 0.5,
    optimal_response_strategy TEXT,
    best_performing_response_id UUID,
    category TEXT NOT NULL,
    subcategory TEXT,
    complexity_level TEXT DEFAULT 'medium',
    requires_expertise TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_clusters_category 
ON public.yana_question_clusters(category, avg_satisfaction DESC);

-- 3. RESPONSE EFFECTIVENESS
CREATE TABLE IF NOT EXISTS public.yana_response_effectiveness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_hash TEXT NOT NULL,
    response_template TEXT NOT NULL,
    category TEXT NOT NULL,
    cluster_id UUID REFERENCES public.yana_question_clusters(id),
    times_used INTEGER DEFAULT 0,
    positive_reactions INTEGER DEFAULT 0,
    negative_reactions INTEGER DEFAULT 0,
    neutral_reactions INTEGER DEFAULT 0,
    avg_follow_up_questions DECIMAL(5,2) DEFAULT 0,
    avg_conversation_length DECIMAL(5,2) DEFAULT 0,
    effectiveness_score DECIMAL(5,4) DEFAULT 0,
    tone TEXT,
    length_category TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_response_effectiveness_score 
ON public.yana_response_effectiveness(effectiveness_score DESC);

-- 4. PERSONALIZATION RECOMMENDATIONS
CREATE TABLE IF NOT EXISTS public.yana_personalization_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    recommendation_type TEXT NOT NULL,
    current_preference JSONB DEFAULT '{}',
    recommended_change JSONB DEFAULT '{}',
    confidence_score DECIMAL(5,4) DEFAULT 0.5,
    based_on_data JSONB DEFAULT '{}',
    applied BOOLEAN DEFAULT false,
    applied_at TIMESTAMPTZ,
    result_after_application JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personalization_user 
ON public.yana_personalization_recommendations(user_id, applied, created_at DESC);

-- 5. SATISFACTION METRICS
CREATE TABLE IF NOT EXISTS public.yana_satisfaction_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    conversation_id TEXT,
    message_id TEXT,
    explicit_rating INTEGER,
    implicit_satisfaction DECIMAL(5,4),
    satisfaction_signals JSONB DEFAULT '{}',
    dissatisfaction_signals JSONB DEFAULT '{}',
    response_quality_factors JSONB DEFAULT '{}',
    improvement_suggestions TEXT[],
    category TEXT,
    period_start TIMESTAMPTZ DEFAULT now(),
    period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_satisfaction_user_period 
ON public.yana_satisfaction_metrics(user_id, created_at DESC);

-- 6. PROMPT VERSION HISTORY
CREATE TABLE IF NOT EXISTS public.yana_prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_section TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    prompt_content TEXT NOT NULL,
    change_summary TEXT,
    change_type TEXT NOT NULL,
    triggered_by TEXT,
    parent_version_id UUID,
    ab_experiment_id UUID,
    effectiveness_before JSONB DEFAULT '{}',
    effectiveness_after JSONB DEFAULT '{}',
    improvement_percentage DECIMAL(7,4),
    is_active BOOLEAN DEFAULT false,
    is_rollback_target BOOLEAN DEFAULT false,
    activated_at TIMESTAMPTZ,
    deactivated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by TEXT DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_section 
ON public.yana_prompt_versions(prompt_section, is_active, version_number DESC);

-- 7. PROACTIVE ALERTS
CREATE TABLE IF NOT EXISTS public.yana_proactive_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    target_user_id UUID,
    target_segment TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    action_label TEXT,
    trigger_conditions JSONB NOT NULL,
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    conversion_action TEXT,
    conversion_achieved BOOLEAN DEFAULT false,
    channel TEXT DEFAULT 'in_app',
    priority INTEGER DEFAULT 5,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by TEXT DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_proactive_alerts_pending 
ON public.yana_proactive_alerts(target_user_id, scheduled_for, sent_at);

-- 8. AUDIT TRAIL
CREATE TABLE IF NOT EXISTS public.yana_decision_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    action_by TEXT NOT NULL,
    action_details JSONB DEFAULT '{}',
    reasoning TEXT,
    data_snapshot JSONB DEFAULT '{}',
    impact_assessment JSONB DEFAULT '{}',
    rollback_possible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_trail_decision 
ON public.yana_decision_audit_trail(decision_id, created_at);

-- 9. EXPERTISE LEVELS
CREATE TABLE IF NOT EXISTS public.yana_expertise_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL UNIQUE,
    current_level TEXT NOT NULL DEFAULT 'intermediate',
    confidence_score DECIMAL(5,4) DEFAULT 0.5,
    total_questions_handled INTEGER DEFAULT 0,
    successful_resolutions INTEGER DEFAULT 0,
    escalations_needed INTEGER DEFAULT 0,
    knowledge_gaps_identified TEXT[],
    last_training_date TIMESTAMPTZ,
    training_data_sources TEXT[],
    performance_trend TEXT DEFAULT 'stable',
    next_level_requirements JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. THERAPY SESSIONS
CREATE TABLE IF NOT EXISTS public.yana_therapy_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    session_type TEXT DEFAULT 'regular',
    emotional_state_start TEXT,
    emotional_state_end TEXT,
    topics_discussed TEXT[],
    breakthroughs JSONB DEFAULT '{}',
    challenges_identified JSONB DEFAULT '{}',
    coping_strategies_suggested TEXT[],
    homework_assigned TEXT,
    homework_completed BOOLEAN,
    session_notes TEXT,
    user_feedback TEXT,
    satisfaction_score DECIMAL(5,4),
    follow_up_scheduled TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_therapy_sessions_user 
ON public.yana_therapy_sessions(user_id, session_date DESC);

-- 11. EMOTIONAL PATTERNS
CREATE TABLE IF NOT EXISTS public.yana_emotional_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    pattern_type TEXT NOT NULL,
    pattern_description TEXT,
    trigger_factors JSONB DEFAULT '{}',
    frequency TEXT,
    severity TEXT DEFAULT 'moderate',
    first_detected_at TIMESTAMPTZ DEFAULT now(),
    last_occurrence_at TIMESTAMPTZ DEFAULT now(),
    occurrence_count INTEGER DEFAULT 1,
    intervention_strategy TEXT,
    intervention_effectiveness DECIMAL(5,4),
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emotional_patterns_user 
ON public.yana_emotional_patterns(user_id, resolved, last_occurrence_at DESC);

-- 12. DECISION LOOPS
CREATE TABLE IF NOT EXISTS public.yana_decision_loops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loop_name TEXT NOT NULL,
    loop_type TEXT NOT NULL,
    trigger_schedule TEXT,
    trigger_conditions JSONB DEFAULT '{}',
    last_run_at TIMESTAMPTZ,
    last_run_status TEXT,
    last_run_duration_ms INTEGER,
    last_run_results JSONB DEFAULT '{}',
    decisions_made INTEGER DEFAULT 0,
    decisions_successful INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.yana_user_behavior ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srv_yana_user_behavior" ON public.yana_user_behavior
FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.yana_question_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srv_yana_question_clusters" ON public.yana_question_clusters
FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.yana_response_effectiveness ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srv_yana_response_effectiveness" ON public.yana_response_effectiveness
FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.yana_personalization_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srv_yana_personalization_recommendations" ON public.yana_personalization_recommendations
FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.yana_satisfaction_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srv_yana_satisfaction_metrics" ON public.yana_satisfaction_metrics
FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.yana_prompt_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srv_yana_prompt_versions" ON public.yana_prompt_versions
FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.yana_proactive_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srv_yana_proactive_alerts" ON public.yana_proactive_alerts
FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "usr_view_own_alerts" ON public.yana_proactive_alerts
FOR SELECT USING (auth.uid() = target_user_id);

ALTER TABLE public.yana_decision_audit_trail ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srv_yana_decision_audit_trail" ON public.yana_decision_audit_trail
FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.yana_expertise_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srv_yana_expertise_levels" ON public.yana_expertise_levels
FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.yana_therapy_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srv_yana_therapy_sessions" ON public.yana_therapy_sessions
FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "usr_view_own_therapy" ON public.yana_therapy_sessions
FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.yana_emotional_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srv_yana_emotional_patterns" ON public.yana_emotional_patterns
FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.yana_decision_loops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "srv_yana_decision_loops" ON public.yana_decision_loops
FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- FUNCȚII
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_response_effectiveness_score()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.positive_reactions + NEW.negative_reactions + NEW.neutral_reactions) > 0 THEN
        NEW.effectiveness_score := (NEW.positive_reactions::DECIMAL - NEW.negative_reactions::DECIMAL * 2) / 
             (NEW.positive_reactions + NEW.negative_reactions + NEW.neutral_reactions)::DECIMAL;
    ELSE
        NEW.effectiveness_score := 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_response_effectiveness ON public.yana_response_effectiveness;
CREATE TRIGGER trigger_update_response_effectiveness
BEFORE INSERT OR UPDATE ON public.yana_response_effectiveness
FOR EACH ROW EXECUTE FUNCTION public.update_response_effectiveness_score();

-- Funcție pentru detectarea pattern-urilor emoționale
CREATE OR REPLACE FUNCTION public.detect_emotional_pattern(
    p_user_id UUID,
    p_emotional_state TEXT,
    p_trigger_factors JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_pattern_id UUID;
    v_pattern_type TEXT;
    v_existing RECORD;
BEGIN
    v_pattern_type := CASE p_emotional_state
        WHEN 'stressed' THEN 'burnout_risk'
        WHEN 'anxious' THEN 'anxiety_spike'
        WHEN 'frustrated' THEN 'motivation_drop'
        WHEN 'excited' THEN 'success_high'
        WHEN 'overwhelmed' THEN 'burnout_risk'
        ELSE 'general_' || COALESCE(p_emotional_state, 'unknown')
    END;
    
    SELECT * INTO v_existing
    FROM public.yana_emotional_patterns
    WHERE user_id = p_user_id
    AND pattern_type = v_pattern_type
    AND resolved = false
    AND last_occurrence_at > now() - INTERVAL '7 days'
    LIMIT 1;
    
    IF v_existing IS NOT NULL THEN
        UPDATE public.yana_emotional_patterns
        SET 
            occurrence_count = occurrence_count + 1,
            last_occurrence_at = now(),
            trigger_factors = trigger_factors || p_trigger_factors,
            severity = CASE 
                WHEN occurrence_count > 5 THEN 'severe'
                WHEN occurrence_count > 2 THEN 'moderate'
                ELSE severity
            END
        WHERE id = v_existing.id
        RETURNING id INTO v_pattern_id;
    ELSE
        INSERT INTO public.yana_emotional_patterns (
            user_id, pattern_type, trigger_factors
        ) VALUES (
            p_user_id, v_pattern_type, p_trigger_factors
        )
        RETURNING id INTO v_pattern_id;
    END IF;
    
    RETURN v_pattern_id;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Inițializare expertise levels
INSERT INTO public.yana_expertise_levels (domain, current_level, confidence_score, total_questions_handled)
VALUES 
    ('fiscal', 'advanced', 0.85, 500),
    ('strategic', 'advanced', 0.82, 400),
    ('emotional', 'intermediate', 0.75, 300),
    ('operational', 'intermediate', 0.70, 200),
    ('legal', 'beginner', 0.60, 100)
ON CONFLICT (domain) DO NOTHING;

-- Inițializare decision loops
INSERT INTO public.yana_decision_loops (loop_name, loop_type, trigger_schedule, config)
VALUES 
    ('Pattern Analysis Loop', 'learning', '0 */6 * * *', '{"min_data_points": 50}'),
    ('Satisfaction Optimization', 'optimization', '0 0 * * *', '{"target_satisfaction": 0.8}'),
    ('Proactive Alert Generator', 'alerting', '*/30 * * * *', '{"check_churn": true}'),
    ('Personalization Engine', 'personalization', '0 */12 * * *', '{"min_interactions": 10}')
ON CONFLICT DO NOTHING;