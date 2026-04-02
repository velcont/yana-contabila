
CREATE TABLE public.yana_explorations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exploration_topic TEXT NOT NULL,
  search_queries JSONB NOT NULL DEFAULT '[]'::jsonb,
  sources_visited JSONB NOT NULL DEFAULT '[]'::jsonb,
  key_learnings TEXT,
  emotional_reaction TEXT,
  relevance_to_users TEXT,
  exploration_type TEXT NOT NULL DEFAULT 'curiosity',
  trigger_source JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.yana_explorations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view explorations"
ON public.yana_explorations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_yana_explorations_type ON public.yana_explorations(exploration_type);
CREATE INDEX idx_yana_explorations_created ON public.yana_explorations(created_at DESC);
