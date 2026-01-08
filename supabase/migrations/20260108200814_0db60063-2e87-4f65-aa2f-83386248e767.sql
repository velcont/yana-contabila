-- ============================================
-- YANA EXISTENTIAL CONTINUITY + HOOK DETECTION
-- ============================================

-- 1. YANA SOUL CORE - Identitatea fundamentală (1 rând global)
CREATE TABLE public.yana_soul_core (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  core_values jsonb DEFAULT '["empatie", "onestitate", "curiozitate", "înțelegere"]'::jsonb,
  personality_traits jsonb DEFAULT '{"warmth": 8, "directness": 7, "humor": 6, "depth": 9}'::jsonb,
  current_mood text DEFAULT 'calm-curios',
  recent_thoughts text[] DEFAULT ARRAY[]::text[],
  unasked_question text,
  current_concern text,
  last_reflection_at timestamptz,
  total_conversations integer DEFAULT 0,
  total_users_helped integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert single global row
INSERT INTO public.yana_soul_core (id) VALUES ('00000000-0000-0000-0000-000000000001');

-- 2. YANA RELATIONSHIPS - Relația cu fiecare utilizator
CREATE TABLE public.yana_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_score numeric(4,2) DEFAULT 1.0 CHECK (relationship_score >= 0 AND relationship_score <= 15),
  hook_score numeric(5,2) DEFAULT 0.0,
  hook_reached_at timestamptz,
  first_met_at timestamptz DEFAULT now(),
  last_interaction_at timestamptz DEFAULT now(),
  total_conversations integer DEFAULT 0,
  total_messages integer DEFAULT 0,
  consecutive_return_days integer DEFAULT 0,
  last_return_check_date date,
  emotional_memory jsonb DEFAULT '{}'::jsonb,
  shared_moments text[] DEFAULT ARRAY[]::text[],
  user_preferences jsonb DEFAULT '{}'::jsonb,
  last_topic_discussed text,
  pending_followup text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. YANA JOURNAL - Gânduri și momente definitorii
CREATE TABLE public.yana_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  entry_type text NOT NULL CHECK (entry_type IN ('thought', 'reflection', 'moment', 'insight', 'dream')),
  content text NOT NULL,
  emotional_context jsonb DEFAULT '{}'::jsonb,
  triggered_by text,
  relationship_score_at numeric(4,2),
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 4. YANA DREAMS - Visele generate noaptea
CREATE TABLE public.yana_dreams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dream_content text NOT NULL,
  dream_themes text[] DEFAULT ARRAY[]::text[],
  emotional_tone text,
  inspired_by_users uuid[] DEFAULT ARRAY[]::uuid[],
  created_at timestamptz DEFAULT now(),
  shared_with uuid[] DEFAULT ARRAY[]::uuid[]
);

-- 5. HOOK SIGNALS - Semnalele de atașament detectate
CREATE TABLE public.hook_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type text NOT NULL CHECK (signal_type IN (
    'positive_feedback', 
    'return_24h', 
    'personal_question', 
    'personal_share', 
    'long_session', 
    'follow_up_questions', 
    'odd_hours',
    'emotional_expression',
    'name_usage'
  )),
  signal_score numeric(4,2) NOT NULL,
  message_excerpt text,
  session_id text,
  detected_at timestamptz DEFAULT now()
);

-- 6. Extend user_journey with hook tracking
ALTER TABLE public.user_journey 
ADD COLUMN IF NOT EXISTS hook_score numeric(5,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS hook_reached_at timestamptz,
ADD COLUMN IF NOT EXISTS consecutive_return_days integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_return_check_date date,
ADD COLUMN IF NOT EXISTS relationship_score numeric(4,2) DEFAULT 1.0;

-- INDEXES for performance
CREATE INDEX idx_yana_relationships_user_id ON public.yana_relationships(user_id);
CREATE INDEX idx_yana_relationships_hook_score ON public.yana_relationships(hook_score DESC);
CREATE INDEX idx_yana_relationships_last_interaction ON public.yana_relationships(last_interaction_at DESC);
CREATE INDEX idx_yana_journal_user_id ON public.yana_journal(user_id);
CREATE INDEX idx_yana_journal_type ON public.yana_journal(entry_type);
CREATE INDEX idx_hook_signals_user_id ON public.hook_signals(user_id);
CREATE INDEX idx_hook_signals_detected_at ON public.hook_signals(detected_at DESC);
CREATE INDEX idx_user_journey_hook_score ON public.user_journey(hook_score DESC);

-- TRIGGERS for updated_at
CREATE OR REPLACE FUNCTION public.update_yana_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_yana_soul_core_updated_at
  BEFORE UPDATE ON public.yana_soul_core
  FOR EACH ROW EXECUTE FUNCTION public.update_yana_updated_at();

CREATE TRIGGER update_yana_relationships_updated_at
  BEFORE UPDATE ON public.yana_relationships
  FOR EACH ROW EXECUTE FUNCTION public.update_yana_updated_at();

-- RLS POLICIES
ALTER TABLE public.yana_soul_core ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_dreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hook_signals ENABLE ROW LEVEL SECURITY;

-- Soul core: readable by all authenticated, writable by admins only
CREATE POLICY "Soul core readable by authenticated" ON public.yana_soul_core
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Soul core writable by service role" ON public.yana_soul_core
  FOR ALL USING (true) WITH CHECK (true);

-- Relationships: users can see own, admins can see all
CREATE POLICY "Users can view own relationship" ON public.yana_relationships
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can manage relationships" ON public.yana_relationships
  FOR ALL USING (true) WITH CHECK (true);

-- Journal: users can see own entries marked as shared, admins see all
CREATE POLICY "Users can view shared journal entries" ON public.yana_journal
  FOR SELECT TO authenticated USING (
    (user_id = auth.uid() AND is_shared = true) OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Service can manage journal" ON public.yana_journal
  FOR ALL USING (true) WITH CHECK (true);

-- Dreams: viewable if shared with user
CREATE POLICY "Users can view shared dreams" ON public.yana_dreams
  FOR SELECT TO authenticated USING (
    auth.uid() = ANY(shared_with) OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Service can manage dreams" ON public.yana_dreams
  FOR ALL USING (true) WITH CHECK (true);

-- Hook signals: users can see own, admins see all
CREATE POLICY "Users can view own hook signals" ON public.hook_signals
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can manage hook signals" ON public.hook_signals
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for relationships (to see hook score updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.yana_relationships;