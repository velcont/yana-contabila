-- Fix RLS policies for balance-attachments storage bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload balance attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own balance attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own balance attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own balance attachments" ON storage.objects;

-- Create correct RLS policies for balance-attachments bucket
CREATE POLICY "Users can upload balance attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'balance-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own balance attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'balance-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own balance attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'balance-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own balance attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'balance-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'balance-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);