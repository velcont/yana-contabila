-- ============================================
-- YANA SELF-LEARNING SYSTEM TABLES
-- ============================================

-- 1. Learning Log - Main extraction table for each conversation
CREATE TABLE public.yana_learning_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- Extracted data
  new_questions TEXT[] DEFAULT '{}',
  given_answers TEXT[] DEFAULT '{}',
  user_preferences JSONB DEFAULT '{}',
  unresolved_signals TEXT[] DEFAULT '{}',
  emotional_state TEXT,
  specific_situation TEXT,
  
  -- Effectiveness tracking
  user_satisfied BOOLEAN,
  response_worked BOOLEAN,
  engagement_score NUMERIC(3,2),
  
  -- Metadata
  message_count INTEGER DEFAULT 1,
  extracted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Knowledge Gaps - Questions YANA doesn't know well
CREATE TABLE public.yana_knowledge_gaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_pattern TEXT NOT NULL,
  example_questions TEXT[] DEFAULT '{}',
  frequency INTEGER DEFAULT 1,
  last_asked_at TIMESTAMP WITH TIME ZONE,
  category TEXT,
  severity TEXT DEFAULT 'medium',
  impact_score NUMERIC(3,2) DEFAULT 0.5,
  resolved BOOLEAN DEFAULT false,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Effective Responses - What worked and what didn't
CREATE TABLE public.yana_effective_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_pattern TEXT NOT NULL,
  context_type TEXT,
  times_used INTEGER DEFAULT 1,
  positive_reactions INTEGER DEFAULT 0,
  negative_reactions INTEGER DEFAULT 0,
  effectiveness_score NUMERIC(3,2),
  key_phrases TEXT[] DEFAULT '{}',
  tone_used TEXT,
  approach_type TEXT,
  example_question TEXT,
  example_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Trending Topics - Cross-user pattern detection
CREATE TABLE public.yana_trending_topics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  topic_category TEXT,
  mention_count INTEGER DEFAULT 1,
  unique_users INTEGER DEFAULT 1,
  user_ids UUID[] DEFAULT '{}',
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE,
  trend_velocity NUMERIC(5,2) DEFAULT 0,
  is_trending BOOLEAN DEFAULT false,
  peak_date DATE,
  related_solutions TEXT[] DEFAULT '{}',
  best_response_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. User Corrections - When users correct YANA
CREATE TABLE public.yana_user_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID,
  original_question TEXT NOT NULL,
  original_answer TEXT NOT NULL,
  correction TEXT NOT NULL,
  correction_type TEXT,
  applied_to_prompts BOOLEAN DEFAULT false,
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Prompt Evolution - Track how prompts change based on learnings
CREATE TABLE public.yana_prompt_evolution (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_type TEXT NOT NULL,
  change_description TEXT NOT NULL,
  change_reason TEXT,
  learning_log_ids UUID[] DEFAULT '{}',
  effectiveness_before NUMERIC(3,2),
  effectiveness_after NUMERIC(3,2),
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.yana_learning_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_knowledge_gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_effective_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_user_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_prompt_evolution ENABLE ROW LEVEL SECURITY;

-- Service role policies (edge functions access) - using auth.role() check
CREATE POLICY "Service role full access learning_log"
  ON public.yana_learning_log FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access knowledge_gaps"
  ON public.yana_knowledge_gaps FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access effective_responses"
  ON public.yana_effective_responses FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access trending_topics"
  ON public.yana_trending_topics FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access user_corrections"
  ON public.yana_user_corrections FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access prompt_evolution"
  ON public.yana_prompt_evolution FOR ALL
  USING (auth.role() = 'service_role');

-- Admin read policies using user_roles table
CREATE POLICY "Admins can view learning_log"
  ON public.yana_learning_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can view knowledge_gaps"
  ON public.yana_knowledge_gaps FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can view effective_responses"
  ON public.yana_effective_responses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can view trending_topics"
  ON public.yana_trending_topics FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can view user_corrections"
  ON public.yana_user_corrections FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can view prompt_evolution"
  ON public.yana_prompt_evolution FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Indexes for performance
CREATE INDEX idx_learning_log_user ON public.yana_learning_log(user_id);
CREATE INDEX idx_learning_log_conversation ON public.yana_learning_log(conversation_id);
CREATE INDEX idx_learning_log_created ON public.yana_learning_log(created_at);
CREATE INDEX idx_knowledge_gaps_frequency ON public.yana_knowledge_gaps(frequency DESC);
CREATE INDEX idx_knowledge_gaps_severity ON public.yana_knowledge_gaps(severity);
CREATE INDEX idx_effective_responses_score ON public.yana_effective_responses(effectiveness_score DESC);
CREATE INDEX idx_trending_topics_trending ON public.yana_trending_topics(is_trending, mention_count DESC);
CREATE INDEX idx_user_corrections_user ON public.yana_user_corrections(user_id);

-- Function to update effectiveness score
CREATE OR REPLACE FUNCTION update_effectiveness_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.effectiveness_score := CASE 
    WHEN (NEW.positive_reactions + NEW.negative_reactions) = 0 THEN 0.5
    ELSE NEW.positive_reactions::NUMERIC / (NEW.positive_reactions + NEW.negative_reactions)::NUMERIC
  END;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_effectiveness
  BEFORE INSERT OR UPDATE ON public.yana_effective_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_effectiveness_score();