-- Create storage bucket for generated documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-documents', 'generated-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create table for document metadata
CREATE TABLE IF NOT EXISTS public.generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_title TEXT NOT NULL,
  main_file_path TEXT NOT NULL,
  guide_file_path TEXT,
  bibliography_file_path TEXT,
  zip_file_path TEXT,
  word_count INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for generated_documents
CREATE POLICY "Users can view own documents"
  ON public.generated_documents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON public.generated_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON public.generated_documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- Storage policies for generated-documents bucket
CREATE POLICY "Users can view own generated documents"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'generated-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own generated documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'generated-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own generated documents"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'generated-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_generated_documents_user_id ON public.generated_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_type ON public.generated_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_generated_documents_created_at ON public.generated_documents(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_generated_documents_updated_at
  BEFORE UPDATE ON public.generated_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();