-- 1. Create dedicated CRM attachments bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crm-attachments', 
  'crm-attachments', 
  false,
  10485760, -- 10MB in bytes
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Policy: Accountants can upload CRM attachments
CREATE POLICY "Accountants can upload CRM attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'crm-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. RLS Policy: Accountants can view own CRM attachments
CREATE POLICY "Accountants can view own CRM attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'crm-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. RLS Policy: Clients can view their company CRM attachments
CREATE POLICY "Clients can view their company CRM attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'crm-attachments' 
  AND EXISTS (
    SELECT 1 FROM companies
    WHERE companies.user_id = auth.uid()
    AND companies.id::text = (storage.foldername(name))[2]
  )
);

-- 5. RLS Policy: Admins can view all CRM attachments
CREATE POLICY "Admins can view all CRM attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'crm-attachments' 
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);