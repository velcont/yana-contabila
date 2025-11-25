-- Drop old policies with incorrect role
DROP POLICY IF EXISTS "Users can upload to own doctorate folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own doctorate documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own doctorate documents" ON storage.objects;

-- Recreate policies with correct role (authenticated)
CREATE POLICY "Users can upload to own doctorate folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'doctorate-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own doctorate documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'doctorate-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own doctorate documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'doctorate-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);