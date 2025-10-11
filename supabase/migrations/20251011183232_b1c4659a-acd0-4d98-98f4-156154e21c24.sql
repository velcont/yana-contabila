-- Storage access policies for balance-attachments
DROP POLICY IF EXISTS "Admin can read balance attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete balance attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own balance attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own balance attachments" ON storage.objects;

-- Allow admins to list/download all files in the bucket
CREATE POLICY "Admin can read balance attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'balance-attachments' AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete any file in the bucket
CREATE POLICY "Admin can delete balance attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'balance-attachments' AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow owners to view their own uploaded files
CREATE POLICY "Users can read own balance attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'balance-attachments' AND owner = auth.uid()
);

-- Optional: allow owners to delete their own files (useful for cleanup)
CREATE POLICY "Users can delete own balance attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'balance-attachments' AND owner = auth.uid()
);
