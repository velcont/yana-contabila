-- Create storage bucket for strategic advisor documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('strategic-documents', 'strategic-documents', false);

-- RLS policies for strategic-documents bucket
CREATE POLICY "Users can upload their own strategic documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'strategic-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own strategic documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'strategic-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own strategic documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'strategic-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Table to track uploaded documents and extracted data
CREATE TABLE public.strategic_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  extracted_text TEXT,
  extracted_facts JSONB DEFAULT '[]'::jsonb,
  processing_status TEXT DEFAULT 'pending',
  error_message TEXT,
  cost_cents INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.strategic_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for strategic_documents table
CREATE POLICY "Users can view their own strategic documents"
ON public.strategic_documents FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own strategic documents"
ON public.strategic_documents FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own strategic documents"
ON public.strategic_documents FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own strategic documents"
ON public.strategic_documents FOR DELETE
TO authenticated
USING (user_id = auth.uid());