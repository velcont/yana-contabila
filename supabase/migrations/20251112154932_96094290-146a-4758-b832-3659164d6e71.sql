-- Create strategic_facts table for storing validated financial data
CREATE TABLE IF NOT EXISTS public.strategic_facts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  validation_status TEXT NOT NULL CHECK (validation_status IN ('approved', 'conflict_detected', 'data_missing')),
  extracted_facts JSONB NOT NULL DEFAULT '{}'::jsonb,
  conflicts JSONB DEFAULT '[]'::jsonb,
  missing_critical_fields JSONB DEFAULT '[]'::jsonb,
  validation_notes TEXT,
  ready_for_strategy BOOLEAN NOT NULL DEFAULT false,
  reason_not_ready TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_strategic_facts_user_id ON public.strategic_facts(user_id);
CREATE INDEX idx_strategic_facts_conversation_id ON public.strategic_facts(conversation_id);
CREATE INDEX idx_strategic_facts_created_at ON public.strategic_facts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.strategic_facts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own strategic facts
CREATE POLICY "Users can view their own strategic facts"
  ON public.strategic_facts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own strategic facts"
  ON public.strategic_facts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own strategic facts"
  ON public.strategic_facts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own strategic facts"
  ON public.strategic_facts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_strategic_facts_updated_at
  BEFORE UPDATE ON public.strategic_facts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for strategic_facts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.strategic_facts;