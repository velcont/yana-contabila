-- Create marketing-assets storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing-assets',
  'marketing-assets',
  false,
  52428800, -- 50MB limit
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
);

-- RLS policy: Only admins can access marketing-assets
CREATE POLICY "Admin full access to marketing assets"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'marketing-assets' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  bucket_id = 'marketing-assets' 
  AND public.has_role(auth.uid(), 'admin'::app_role)
);