-- Faza 2: Tabel pentru Reasoning Logs (Governance Layer)
-- Salvează pașii de gândire ReAct pentru auditabilitate

CREATE TABLE public.strategic_reasoning_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  message_index INTEGER, -- pentru a lega de mesajul specific
  step_type TEXT NOT NULL, -- 'observation', 'methodology', 'reasoning', 'recommendation', 'continuation'
  step_content TEXT NOT NULL,
  methodology_used TEXT, -- 'Porter', 'SWOT', 'BCG', 'ToC', 'Blue Ocean', null
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.strategic_reasoning_steps ENABLE ROW LEVEL SECURITY;

-- Users can view their own reasoning steps
CREATE POLICY "Users can view their own reasoning steps"
ON public.strategic_reasoning_steps
FOR SELECT
USING (auth.uid() = user_id);

-- System (edge functions) can insert reasoning steps
CREATE POLICY "Users can insert their own reasoning steps"
ON public.strategic_reasoning_steps
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add indexes for fast lookups
CREATE INDEX idx_reasoning_steps_conversation 
ON public.strategic_reasoning_steps(conversation_id);

CREATE INDEX idx_reasoning_steps_user 
ON public.strategic_reasoning_steps(user_id);

-- Add comment for documentation
COMMENT ON TABLE public.strategic_reasoning_steps IS 'Stores ReAct reasoning steps for Strategic Advisor transparency and governance';