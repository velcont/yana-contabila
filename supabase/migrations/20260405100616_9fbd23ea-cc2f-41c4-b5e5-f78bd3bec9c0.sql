
-- Table to track gradual briefing rollout (5 users/day)
CREATE TABLE public.briefing_rollout (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  batch_number INTEGER NOT NULL DEFAULT 1
);

-- Enable RLS but no public policies - only service role access
ALTER TABLE public.briefing_rollout ENABLE ROW LEVEL SECURITY;

-- Index for fast lookups
CREATE INDEX idx_briefing_rollout_user_id ON public.briefing_rollout (user_id);
CREATE INDEX idx_briefing_rollout_enrolled_at ON public.briefing_rollout (enrolled_at DESC);
