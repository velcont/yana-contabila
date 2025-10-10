-- Adaugă protecție pentru analize după import contabil
ALTER TABLE public.analyses 
ADD COLUMN is_locked BOOLEAN DEFAULT false,
ADD COLUMN locked_at TIMESTAMP WITH TIME ZONE;

-- Comentariu pe coloane
COMMENT ON COLUMN public.analyses.is_locked IS 'Marchează analiza ca fiind blocată după import în contabilitate';
COMMENT ON COLUMN public.analyses.locked_at IS 'Data când analiza a fost blocată';

-- Creează policy pentru a bloca UPDATE pe analize locked
CREATE POLICY "Cannot update locked analyses"
ON public.analyses
FOR UPDATE
USING (
  (auth.uid() = user_id) AND 
  (is_locked = false OR is_locked IS NULL)
);

-- Creează policy pentru a bloca DELETE pe analize locked  
CREATE POLICY "Cannot delete locked analyses"
ON public.analyses
FOR DELETE
USING (
  (auth.uid() = user_id) AND 
  (is_locked = false OR is_locked IS NULL)
);

-- Creează bucket pentru balanțe atașate la emailuri (dacă nu există)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'balance-attachments',
  'balance-attachments',
  false,
  10485760, -- 10MB limit
  ARRAY['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies pentru bucket-ul de balanțe
CREATE POLICY "Users can upload their own balance attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'balance-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own balance attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'balance-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own balance attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'balance-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);