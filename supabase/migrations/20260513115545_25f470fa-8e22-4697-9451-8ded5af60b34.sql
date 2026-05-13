
-- Yana Projects: dedicated workspaces grouping conversations + knowledge files
CREATE TABLE public.yana_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'folder',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_yana_projects_user ON public.yana_projects(user_id, is_archived, updated_at DESC);

ALTER TABLE public.yana_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own projects" ON public.yana_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own projects" ON public.yana_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own projects" ON public.yana_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own projects" ON public.yana_projects FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_yana_projects_updated_at
BEFORE UPDATE ON public.yana_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add project_id to conversations
ALTER TABLE public.yana_conversations
  ADD COLUMN project_id UUID REFERENCES public.yana_projects(id) ON DELETE SET NULL;

CREATE INDEX idx_yana_conversations_project ON public.yana_conversations(project_id, updated_at DESC);

-- Project knowledge files (metadata only; binary in storage bucket)
CREATE TABLE public.yana_project_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.yana_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  extracted_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_yana_project_files_project ON public.yana_project_files(project_id, created_at DESC);

ALTER TABLE public.yana_project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own project files" ON public.yana_project_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own project files" ON public.yana_project_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own project files" ON public.yana_project_files FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for project knowledge files (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('yana-project-files', 'yana-project-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own project files storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'yana-project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own project files storage"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'yana-project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own project files storage"
ON storage.objects FOR DELETE
USING (bucket_id = 'yana-project-files' AND auth.uid()::text = (storage.foldername(name))[1]);
