-- Create table for AI self-reflection logs
CREATE TABLE public.ai_reflection_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer_preview TEXT NOT NULL,
  self_score INTEGER NOT NULL CHECK (self_score >= 1 AND self_score <= 10),
  confidence_level TEXT NOT NULL CHECK (confidence_level IN ('low', 'medium', 'high')),
  what_went_well TEXT[] DEFAULT '{}',
  what_could_improve TEXT[] DEFAULT '{}',
  missing_context TEXT,
  suggested_sources TEXT[] DEFAULT '{}',
  model_used TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  tokens_used INTEGER DEFAULT 0,
  processing_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_reflection_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read reflection logs (using has_role RPC)
CREATE POLICY "Admins can view all reflection logs"
ON public.ai_reflection_logs
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Service role can insert (edge functions)
CREATE POLICY "Service role can insert reflection logs"
ON public.ai_reflection_logs
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_ai_reflection_logs_user_id ON public.ai_reflection_logs(user_id);
CREATE INDEX idx_ai_reflection_logs_created_at ON public.ai_reflection_logs(created_at DESC);
CREATE INDEX idx_ai_reflection_logs_self_score ON public.ai_reflection_logs(self_score);

-- Add comment
COMMENT ON TABLE public.ai_reflection_logs IS 'Stores AI self-evaluation data for each conversation response';