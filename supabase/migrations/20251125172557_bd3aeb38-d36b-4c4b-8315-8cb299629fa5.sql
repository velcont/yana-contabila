-- Restricționare completă: DOAR office@velcont.com poate accesa /admin și funcționalitățile de doctorat
-- User ID: 01632447-e347-4485-94f1-dc9792599d8e

-- PASUL 1: Asigurare admin DOAR pentru office@velcont.com
DELETE FROM public.user_roles 
WHERE role = 'admin' 
  AND user_id != '01632447-e347-4485-94f1-dc9792599d8e';

INSERT INTO public.user_roles (user_id, role)
VALUES ('01632447-e347-4485-94f1-dc9792599d8e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- PASUL 2: Restricționare tabele doctorat - DOAR pentru office@velcont.com

-- doctorate_chapters
DROP POLICY IF EXISTS "Users can manage their own chapters" ON doctorate_chapters;
DROP POLICY IF EXISTS "Only owner can access doctorate chapters" ON doctorate_chapters;

CREATE POLICY "Only owner can access doctorate chapters"
ON doctorate_chapters FOR ALL TO authenticated
USING (user_id = '01632447-e347-4485-94f1-dc9792599d8e'::uuid)
WITH CHECK (user_id = '01632447-e347-4485-94f1-dc9792599d8e'::uuid);

-- doctorate_chapter_files
DROP POLICY IF EXISTS "Users can manage their own chapter files" ON doctorate_chapter_files;
DROP POLICY IF EXISTS "Only owner can access doctorate chapter files" ON doctorate_chapter_files;

CREATE POLICY "Only owner can access doctorate chapter files"
ON doctorate_chapter_files FOR ALL TO authenticated
USING (user_id = '01632447-e347-4485-94f1-dc9792599d8e'::uuid)
WITH CHECK (user_id = '01632447-e347-4485-94f1-dc9792599d8e'::uuid);

-- doctorate_structure
DROP POLICY IF EXISTS "Users can manage their own structure" ON doctorate_structure;
DROP POLICY IF EXISTS "Only owner can access doctorate structure" ON doctorate_structure;

CREATE POLICY "Only owner can access doctorate structure"
ON doctorate_structure FOR ALL TO authenticated
USING (user_id = '01632447-e347-4485-94f1-dc9792599d8e'::uuid)
WITH CHECK (user_id = '01632447-e347-4485-94f1-dc9792599d8e'::uuid);

-- research_data
DROP POLICY IF EXISTS "Users can manage their own research data" ON research_data;
DROP POLICY IF EXISTS "Only owner can access research data" ON research_data;

CREATE POLICY "Only owner can access research data"
ON research_data FOR ALL TO authenticated
USING (user_id = '01632447-e347-4485-94f1-dc9792599d8e'::uuid)
WITH CHECK (user_id = '01632447-e347-4485-94f1-dc9792599d8e'::uuid);

-- PASUL 3: Restricționare storage doctorate-documents
DROP POLICY IF EXISTS "Users can upload to own doctorate folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own doctorate documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own doctorate documents" ON storage.objects;
DROP POLICY IF EXISTS "Only owner can upload doctorate files" ON storage.objects;
DROP POLICY IF EXISTS "Only owner can view doctorate files" ON storage.objects;
DROP POLICY IF EXISTS "Only owner can delete doctorate files" ON storage.objects;

CREATE POLICY "Only owner can upload doctorate files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'doctorate-documents' 
  AND (storage.foldername(name))[1] = '01632447-e347-4485-94f1-dc9792599d8e'
);

CREATE POLICY "Only owner can view doctorate files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'doctorate-documents' 
  AND (storage.foldername(name))[1] = '01632447-e347-4485-94f1-dc9792599d8e'
);

CREATE POLICY "Only owner can delete doctorate files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'doctorate-documents' 
  AND (storage.foldername(name))[1] = '01632447-e347-4485-94f1-dc9792599d8e'
);