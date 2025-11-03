-- Create doctorate_chapters table for individual chapter management
CREATE TABLE IF NOT EXISTS public.doctorate_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  chapter_title TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  file_name TEXT,
  file_path TEXT,
  content TEXT,
  word_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'final')),
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  last_modified TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create doctorate_structure table for overall doctorate tracking
CREATE TABLE IF NOT EXISTS public.doctorate_structure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Teză de Doctorat',
  abstract TEXT,
  keywords TEXT[],
  total_word_count INTEGER DEFAULT 0,
  completion_percent INTEGER DEFAULT 0,
  last_compiled TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.doctorate_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctorate_structure ENABLE ROW LEVEL SECURITY;

-- RLS Policies for doctorate_chapters
CREATE POLICY "Users can view own doctorate chapters"
  ON public.doctorate_chapters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own doctorate chapters"
  ON public.doctorate_chapters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own doctorate chapters"
  ON public.doctorate_chapters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own doctorate chapters"
  ON public.doctorate_chapters FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for doctorate_structure
CREATE POLICY "Users can view own doctorate structure"
  ON public.doctorate_structure FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own doctorate structure"
  ON public.doctorate_structure FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own doctorate structure"
  ON public.doctorate_structure FOR UPDATE
  USING (auth.uid() = user_id);

-- Create storage bucket for doctorate documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('doctorate-documents', 'doctorate-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for doctorate-documents
CREATE POLICY "Users can upload to own doctorate folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'doctorate-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own doctorate documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'doctorate-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own doctorate documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'doctorate-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_doctorate_chapters_user_id ON public.doctorate_chapters(user_id);
CREATE INDEX IF NOT EXISTS idx_doctorate_chapters_chapter_number ON public.doctorate_chapters(chapter_number);
CREATE INDEX IF NOT EXISTS idx_doctorate_structure_user_id ON public.doctorate_structure(user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_doctorate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_doctorate_chapters_updated_at
  BEFORE UPDATE ON public.doctorate_chapters
  FOR EACH ROW
  EXECUTE FUNCTION update_doctorate_updated_at();

CREATE TRIGGER update_doctorate_structure_updated_at
  BEFORE UPDATE ON public.doctorate_structure
  FOR EACH ROW
  EXECUTE FUNCTION update_doctorate_updated_at();