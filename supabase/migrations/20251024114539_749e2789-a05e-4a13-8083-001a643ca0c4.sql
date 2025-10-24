-- Create table for humanized texts storage
CREATE TABLE IF NOT EXISTS public.humanized_texts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_text TEXT NOT NULL,
  humanized_text TEXT NOT NULL,
  humanization_level TEXT NOT NULL DEFAULT 'moderate',
  tone_style TEXT NOT NULL DEFAULT 'academic_formal',
  word_count_original INTEGER,
  word_count_humanized INTEGER,
  changes_percent NUMERIC,
  statistics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.humanized_texts ENABLE ROW LEVEL SECURITY;

-- Users can view their own humanized texts
CREATE POLICY "Users can view own humanized texts"
ON public.humanized_texts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own humanized texts
CREATE POLICY "Users can insert own humanized texts"
ON public.humanized_texts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own humanized texts
CREATE POLICY "Users can delete own humanized texts"
ON public.humanized_texts
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_humanized_texts_user_id ON public.humanized_texts(user_id);
CREATE INDEX IF NOT EXISTS idx_humanized_texts_created_at ON public.humanized_texts(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_humanized_texts_updated_at
BEFORE UPDATE ON public.humanized_texts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();