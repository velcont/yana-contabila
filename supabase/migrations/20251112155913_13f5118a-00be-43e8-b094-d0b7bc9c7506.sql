-- Create strategic_advisor_facts table (if not exists)
CREATE TABLE IF NOT EXISTS public.strategic_advisor_facts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fact_category TEXT NOT NULL,
  fact_key TEXT NOT NULL,
  fact_value TEXT NOT NULL,
  fact_unit TEXT,
  confidence DECIMAL(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  source TEXT DEFAULT 'ai_extraction',
  status TEXT DEFAULT 'validated' CHECK (status IN ('validated', 'pending', 'rejected')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(conversation_id, fact_key)
);

-- Create strategic_advisor_validations table (if not exists)
CREATE TABLE IF NOT EXISTS public.strategic_advisor_validations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  validator_response JSONB NOT NULL,
  validator_model TEXT NOT NULL,
  validator_tokens_used INTEGER DEFAULT 0,
  validation_status TEXT NOT NULL CHECK (validation_status IN ('approved', 'data_missing', 'conflict_detected')),
  missing_fields TEXT[] DEFAULT ARRAY[]::TEXT[],
  conflicts JSONB DEFAULT '[]'::jsonb,
  total_cost_cents INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.strategic_advisor_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_advisor_validations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for strategic_advisor_facts
CREATE POLICY "Users can view their own facts"
  ON public.strategic_advisor_facts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own facts"
  ON public.strategic_advisor_facts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own facts"
  ON public.strategic_advisor_facts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own facts"
  ON public.strategic_advisor_facts
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for strategic_advisor_validations
CREATE POLICY "Users can view their own validations"
  ON public.strategic_advisor_validations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own validations"
  ON public.strategic_advisor_validations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_strategic_advisor_facts_conversation 
  ON public.strategic_advisor_facts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_strategic_advisor_facts_user 
  ON public.strategic_advisor_facts(user_id);
CREATE INDEX IF NOT EXISTS idx_strategic_advisor_facts_status 
  ON public.strategic_advisor_facts(status);

CREATE INDEX IF NOT EXISTS idx_strategic_advisor_validations_conversation 
  ON public.strategic_advisor_validations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_strategic_advisor_validations_user 
  ON public.strategic_advisor_validations(user_id);

-- Enable realtime for facts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.strategic_advisor_facts;