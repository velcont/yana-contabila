-- Creează storage bucket pentru contracte și documente
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'legal-documents',
  'legal-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
);

-- RLS policies pentru legal-documents bucket
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'legal-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'legal-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'legal-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Tabel pentru a stoca metadate despre documentele juridice analizate
CREATE TABLE public.legal_document_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  document_name TEXT NOT NULL,
  document_path TEXT NOT NULL,
  document_type TEXT NOT NULL, -- 'contract', 'invoice', 'agreement', etc.
  extracted_text TEXT,
  analysis_summary JSONB,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  key_points JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pentru căutări rapide
CREATE INDEX idx_legal_docs_user_conversation ON public.legal_document_analyses(user_id, conversation_id);
CREATE INDEX idx_legal_docs_created ON public.legal_document_analyses(created_at DESC);

-- RLS policies pentru legal_document_analyses
ALTER TABLE public.legal_document_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own document analyses"
ON public.legal_document_analyses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own document analyses"
ON public.legal_document_analyses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own document analyses"
ON public.legal_document_analyses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document analyses"
ON public.legal_document_analyses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger pentru updated_at
CREATE TRIGGER update_legal_docs_updated_at
BEFORE UPDATE ON public.legal_document_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();