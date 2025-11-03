-- Create plagiarism analyses table
CREATE TABLE IF NOT EXISTS public.plagiarism_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  chapter_id UUID REFERENCES public.doctorate_chapter_files(id) ON DELETE SET NULL,
  chapter_number INTEGER NOT NULL,
  chapter_title TEXT NOT NULL,
  analysis_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  plagiarism_probability INTEGER NOT NULL CHECK (plagiarism_probability >= 0 AND plagiarism_probability <= 100),
  detailed_report JSONB NOT NULL,
  recommendations TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_plagiarism_user_id ON public.plagiarism_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_chapter ON public.plagiarism_analyses(chapter_id);
CREATE INDEX IF NOT EXISTS idx_plagiarism_date ON public.plagiarism_analyses(analysis_date DESC);

-- Enable RLS
ALTER TABLE public.plagiarism_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own plagiarism analyses"
  ON public.plagiarism_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plagiarism analyses"
  ON public.plagiarism_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plagiarism analyses"
  ON public.plagiarism_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plagiarism analyses"
  ON public.plagiarism_analyses FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_plagiarism_analyses_updated_at
  BEFORE UPDATE ON public.plagiarism_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();