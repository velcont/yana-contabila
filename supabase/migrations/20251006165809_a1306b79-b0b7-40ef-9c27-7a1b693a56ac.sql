-- Create research_data table for doctoral research
CREATE TABLE IF NOT EXISTS public.research_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_collection_date DATE NOT NULL,
  course_name TEXT NOT NULL,
  research_theme TEXT NOT NULL,
  case_studies JSONB NOT NULL DEFAULT '[]'::jsonb,
  theoretical_frameworks JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics_collected JSONB NOT NULL DEFAULT '{}'::jsonb,
  research_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.research_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own research data"
  ON public.research_data
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own research data"
  ON public.research_data
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own research data"
  ON public.research_data
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own research data"
  ON public.research_data
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_research_data_updated_at
  BEFORE UPDATE ON public.research_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();