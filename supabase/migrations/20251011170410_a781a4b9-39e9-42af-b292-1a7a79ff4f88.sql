-- Create RLS policies for balance-attachments storage bucket

-- Policy to allow authenticated users to upload their own files
CREATE POLICY "Users can upload balance attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'balance-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow authenticated users to view their own files
CREATE POLICY "Users can view own balance attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'balance-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow authenticated users to delete their own files
CREATE POLICY "Users can delete own balance attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'balance-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow service role to upload files (for edge functions)
CREATE POLICY "Service role can upload balance attachments"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'balance-attachments');