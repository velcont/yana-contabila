-- Create ai_corrections table for learning from user corrections
CREATE TABLE public.ai_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  user_id UUID NOT NULL,
  original_question TEXT NOT NULL,
  wrong_answer TEXT,
  correct_answer TEXT NOT NULL,
  correction_type TEXT DEFAULT 'clasificare',
  validated_by_admin BOOLEAN DEFAULT false,
  applied_to_knowledge BOOLEAN DEFAULT false,
  admin_notes TEXT,
  validated_at TIMESTAMPTZ,
  validated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_corrections ENABLE ROW LEVEL SECURITY;

-- Users can create their own corrections
CREATE POLICY "Users can create corrections"
  ON public.ai_corrections 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own corrections
CREATE POLICY "Users can view own corrections"
  ON public.ai_corrections 
  FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can do everything (for admin operations via edge functions)
CREATE POLICY "Service role full access"
  ON public.ai_corrections 
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_ai_corrections_user_id ON public.ai_corrections(user_id);
CREATE INDEX idx_ai_corrections_validated ON public.ai_corrections(validated_by_admin);
CREATE INDEX idx_ai_corrections_type ON public.ai_corrections(correction_type);
CREATE INDEX idx_ai_corrections_created ON public.ai_corrections(created_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_ai_corrections_updated_at
  BEFORE UPDATE ON public.ai_corrections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();