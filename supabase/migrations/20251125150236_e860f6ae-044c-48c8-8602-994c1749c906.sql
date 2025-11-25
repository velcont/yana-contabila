-- Fix storage RLS for doctorate-documents: use role PUBLIC, not AUTHENTICATED
DROP POLICY IF EXISTS "Users can upload to own doctorate folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own doctorate documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own doctorate documents" ON storage.objects;

CREATE POLICY "Users can upload to own doctorate folder"
ON storage.objects FOR INSERT TO public
WITH CHECK (
  bucket_id = 'doctorate-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own doctorate documents"
ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'doctorate-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own doctorate documents"
ON storage.objects FOR DELETE TO public
USING (
  bucket_id = 'doctorate-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);