-- ============================================================================
-- SISTEMUL AGENTIC YANA - TABELE COMPLETE
-- ============================================================================

-- 1. A/B Testing pentru variante de răspuns
CREATE TABLE IF NOT EXISTS public.yana_ab_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_name TEXT NOT NULL,
    hypothesis TEXT NOT NULL,
    variant_a JSONB NOT NULL DEFAULT '{}',
    variant_b JSONB NOT NULL DEFAULT '{}',
    metric_type TEXT NOT NULL DEFAULT 'satisfaction_score',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'winner_a', 'winner_b')),
    category TEXT,
    variant_a_impressions INTEGER DEFAULT 0,
    variant_b_impressions INTEGER DEFAULT 0,
    variant_a_conversions INTEGER DEFAULT 0,
    variant_b_conversions INTEGER DEFAULT 0,
    variant_a_score DECIMAL(5,4) DEFAULT 0,
    variant_b_score DECIMAL(5,4) DEFAULT 0,
    statistical_significance DECIMAL(5,4) DEFAULT 0,
    min_sample_size INTEGER DEFAULT 100,
    winner_auto_applied BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_by TEXT DEFAULT 'system'
);

-- 2. User type context evolution
CREATE TABLE IF NOT EXISTS public.yana_user_context_evolution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_type TEXT DEFAULT 'unknown',
    context_snapshot JSONB NOT NULL DEFAULT '{}',
    interaction_count INTEGER DEFAULT 0,
    topics_discussed TEXT[] DEFAULT '{}',
    preferred_response_style TEXT,
    preferred_categories TEXT[] DEFAULT '{}',
    satisfaction_trend DECIMAL(5,4) DEFAULT 0.5,
    last_satisfaction_score DECIMAL(5,4),
    churn_risk_score DECIMAL(5,4) DEFAULT 0,
    engagement_velocity DECIMAL(10,4) DEFAULT 0,
    captured_at TIMESTAMPTZ DEFAULT now(),
    period_start TIMESTAMPTZ DEFAULT now(),
    period_end TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_context_evolution_user_period 
ON public.yana_user_context_evolution(user_id, captured_at DESC);

-- 3. Improvement decisions
CREATE TABLE IF NOT EXISTS public.yana_improvement_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_type TEXT NOT NULL,
    trigger_reason TEXT NOT NULL,
    trigger_data JSONB DEFAULT '{}',
    decision_content JSONB NOT NULL,
    impact_scope TEXT DEFAULT 'all_users',
    applied_at TIMESTAMPTZ,
    rollback_at TIMESTAMPTZ,
    rollback_reason TEXT,
    measured_impact JSONB DEFAULT '{}',
    confidence_score DECIMAL(5,4) DEFAULT 0.5,
    auto_approved BOOLEAN DEFAULT false,
    approved_by TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'applied', 'rolled_back', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Proactive response patterns
CREATE TABLE IF NOT EXISTS public.yana_proactive_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_name TEXT NOT NULL,
    trigger_conditions JSONB NOT NULL,
    user_segment TEXT DEFAULT 'all',
    response_template TEXT NOT NULL,
    priority INTEGER DEFAULT 5,
    activation_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    cooldown_hours INTEGER DEFAULT 24,
    last_activated_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Common requests aggregation
CREATE TABLE IF NOT EXISTS public.yana_common_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_pattern TEXT NOT NULL,
    canonical_form TEXT NOT NULL,
    category TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    unique_users INTEGER DEFAULT 1,
    user_ids UUID[] DEFAULT '{}',
    sample_questions TEXT[] DEFAULT '{}',
    optimal_response_id UUID,
    avg_satisfaction DECIMAL(5,4) DEFAULT 0.5,
    first_seen_at TIMESTAMPTZ DEFAULT now(),
    last_seen_at TIMESTAMPTZ DEFAULT now(),
    is_trending BOOLEAN DEFAULT false,
    urgency_score DECIMAL(5,4) DEFAULT 0.5,
    auto_response_enabled BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_common_requests_frequency 
ON public.yana_common_requests(frequency DESC);

CREATE INDEX IF NOT EXISTS idx_common_requests_category 
ON public.yana_common_requests(category);

-- 6. Prompt evolution history
DROP TABLE IF EXISTS public.yana_prompt_evolution CASCADE;
CREATE TABLE public.yana_prompt_evolution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_section TEXT NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    content_hash TEXT NOT NULL,
    prompt_content TEXT NOT NULL,
    change_reason TEXT,
    triggered_by TEXT DEFAULT 'system',
    ab_experiment_id UUID,
    performance_before JSONB DEFAULT '{}',
    performance_after JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by TEXT DEFAULT 'system'
);

CREATE INDEX idx_prompt_evo_section_active 
ON public.yana_prompt_evolution(prompt_section, is_active, version_number DESC);

-- 7. User corrections
DROP TABLE IF EXISTS public.yana_user_corrections CASCADE;
CREATE TABLE public.yana_user_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    conversation_id TEXT,
    original_response TEXT NOT NULL,
    user_correction TEXT NOT NULL,
    correction_category TEXT,
    ai_analysis JSONB DEFAULT '{}',
    applied_to_prompt BOOLEAN DEFAULT false,
    applied_at TIMESTAMPTZ,
    pattern_extracted TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_corrections_category 
ON public.yana_user_corrections(correction_category);

-- ============================================================================
-- RLS POLICIES - Service role only (no role column in profiles)
-- ============================================================================

ALTER TABLE public.yana_ab_experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role ab_experiments" ON public.yana_ab_experiments
FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.yana_user_context_evolution ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role context_evolution" ON public.yana_user_context_evolution
FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.yana_improvement_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role improvement_decisions" ON public.yana_improvement_decisions
FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.yana_proactive_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role proactive_patterns" ON public.yana_proactive_patterns
FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.yana_common_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role common_requests" ON public.yana_common_requests
FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.yana_prompt_evolution ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role prompt_evolution" ON public.yana_prompt_evolution
FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE public.yana_user_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role user_corrections" ON public.yana_user_corrections
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users insert own corrections" ON public.yana_user_corrections
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- FUNCȚII PENTRU SISTEMUL AGENTIC
-- ============================================================================

-- Auto-calculate A/B experiment statistics
CREATE OR REPLACE FUNCTION public.calculate_ab_experiment_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.variant_a_impressions > 0 THEN
        NEW.variant_a_score := NEW.variant_a_conversions::DECIMAL / NEW.variant_a_impressions::DECIMAL;
    END IF;
    
    IF NEW.variant_b_impressions > 0 THEN
        NEW.variant_b_score := NEW.variant_b_conversions::DECIMAL / NEW.variant_b_impressions::DECIMAL;
    END IF;
    
    IF NEW.variant_a_impressions >= 30 AND NEW.variant_b_impressions >= 30 THEN
        DECLARE
            p1 DECIMAL := NEW.variant_a_score;
            p2 DECIMAL := NEW.variant_b_score;
            n1 INTEGER := NEW.variant_a_impressions;
            n2 INTEGER := NEW.variant_b_impressions;
            p_pooled DECIMAL;
            se DECIMAL;
            z_score DECIMAL;
        BEGIN
            p_pooled := (NEW.variant_a_conversions + NEW.variant_b_conversions)::DECIMAL / (n1 + n2)::DECIMAL;
            IF p_pooled > 0 AND p_pooled < 1 THEN
                se := SQRT(p_pooled * (1 - p_pooled) * (1.0/n1 + 1.0/n2));
                IF se > 0 THEN
                    z_score := ABS(p1 - p2) / se;
                    NEW.statistical_significance := LEAST(z_score / 3.0, 1.0);
                END IF;
            END IF;
        END;
    END IF;
    
    IF NEW.statistical_significance >= 0.95 AND 
       NEW.variant_a_impressions >= NEW.min_sample_size AND 
       NEW.variant_b_impressions >= NEW.min_sample_size AND
       NEW.status = 'active' THEN
        IF NEW.variant_a_score > NEW.variant_b_score THEN
            NEW.status := 'winner_a';
        ELSE
            NEW.status := 'winner_b';
        END IF;
        NEW.completed_at := now();
    END IF;
    
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_calculate_ab_stats ON public.yana_ab_experiments;
CREATE TRIGGER trigger_calculate_ab_stats
BEFORE UPDATE ON public.yana_ab_experiments
FOR EACH ROW EXECUTE FUNCTION public.calculate_ab_experiment_stats();

-- Aggregate common requests
CREATE OR REPLACE FUNCTION public.aggregate_common_request(
    p_pattern TEXT,
    p_category TEXT,
    p_user_id UUID,
    p_sample_question TEXT
) RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
    v_canonical TEXT;
BEGIN
    v_canonical := LOWER(TRIM(regexp_replace(p_pattern, '[^a-zA-Z0-9\săîâșțĂÎÂȘȚ]', '', 'g')));
    
    SELECT id INTO v_request_id
    FROM public.yana_common_requests
    WHERE canonical_form = v_canonical
    LIMIT 1;
    
    IF v_request_id IS NOT NULL THEN
        UPDATE public.yana_common_requests
        SET 
            frequency = frequency + 1,
            unique_users = CASE 
                WHEN NOT (p_user_id = ANY(user_ids)) THEN unique_users + 1 
                ELSE unique_users 
            END,
            user_ids = CASE 
                WHEN NOT (p_user_id = ANY(user_ids)) THEN array_append(user_ids, p_user_id)
                ELSE user_ids
            END,
            sample_questions = array_append(
                sample_questions[array_length(sample_questions, 1) - 4:], 
                p_sample_question
            ),
            last_seen_at = now(),
            is_trending = frequency >= 10
        WHERE id = v_request_id;
    ELSE
        INSERT INTO public.yana_common_requests (
            request_pattern, canonical_form, category, 
            user_ids, sample_questions
        ) VALUES (
            p_pattern, v_canonical, p_category,
            ARRAY[p_user_id], ARRAY[p_sample_question]
        )
        RETURNING id INTO v_request_id;
    END IF;
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Track user context evolution
CREATE OR REPLACE FUNCTION public.track_user_context_evolution(
    p_user_id UUID,
    p_satisfaction_score DECIMAL DEFAULT NULL,
    p_topics TEXT[] DEFAULT NULL,
    p_response_style TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_last_snapshot RECORD;
    v_interaction_count INTEGER;
    v_new_user_type TEXT;
    v_churn_risk DECIMAL;
    v_engagement_velocity DECIMAL;
BEGIN
    SELECT * INTO v_last_snapshot
    FROM public.yana_user_context_evolution
    WHERE user_id = p_user_id
    ORDER BY captured_at DESC
    LIMIT 1;
    
    SELECT COUNT(*) INTO v_interaction_count
    FROM public.yana_learning_log
    WHERE user_id = p_user_id;
    
    IF v_interaction_count < 5 THEN
        v_new_user_type := 'newbie';
    ELSIF v_interaction_count < 30 THEN
        v_new_user_type := 'regular';
    ELSE
        v_new_user_type := 'power_user';
    END IF;
    
    SELECT COUNT(*)::DECIMAL / 7.0 INTO v_engagement_velocity
    FROM public.yana_learning_log
    WHERE user_id = p_user_id
    AND created_at > now() - INTERVAL '7 days';
    
    IF v_last_snapshot IS NOT NULL THEN
        IF v_last_snapshot.captured_at < now() - INTERVAL '14 days' THEN
            v_churn_risk := 0.8;
        ELSIF v_last_snapshot.captured_at < now() - INTERVAL '7 days' THEN
            v_churn_risk := 0.5;
        ELSIF v_engagement_velocity < 0.2 THEN
            v_churn_risk := 0.4;
        ELSE
            v_churn_risk := 0.1;
        END IF;
    ELSE
        v_churn_risk := 0.3;
    END IF;
    
    IF p_satisfaction_score IS NOT NULL AND p_satisfaction_score > 0.7 THEN
        v_churn_risk := v_churn_risk * 0.5;
    END IF;
    
    IF v_last_snapshot IS NULL 
       OR v_last_snapshot.user_type != v_new_user_type
       OR v_last_snapshot.captured_at < now() - INTERVAL '7 days'
       OR ABS(COALESCE(v_last_snapshot.churn_risk_score, 0) - v_churn_risk) > 0.2 THEN
        
        INSERT INTO public.yana_user_context_evolution (
            user_id, user_type, interaction_count,
            topics_discussed, preferred_response_style,
            satisfaction_trend, last_satisfaction_score,
            churn_risk_score, engagement_velocity,
            context_snapshot
        ) VALUES (
            p_user_id, v_new_user_type, v_interaction_count,
            COALESCE(p_topics, v_last_snapshot.topics_discussed, '{}'),
            COALESCE(p_response_style, v_last_snapshot.preferred_response_style),
            COALESCE(p_satisfaction_score, v_last_snapshot.satisfaction_trend, 0.5),
            p_satisfaction_score,
            v_churn_risk, v_engagement_velocity,
            jsonb_build_object(
                'interaction_count', v_interaction_count,
                'engagement_velocity', v_engagement_velocity,
                'churn_risk', v_churn_risk,
                'timestamp', now()
            )
        );
    END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;