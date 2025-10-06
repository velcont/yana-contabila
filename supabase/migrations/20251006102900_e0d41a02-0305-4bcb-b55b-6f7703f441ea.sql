-- Tabele pentru colaborare pe rapoarte

-- Tabel pentru sharing de analize
CREATE TABLE IF NOT EXISTS public.analysis_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  shared_with_email TEXT NOT NULL,
  shared_with_user_id UUID,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'comment', 'edit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(analysis_id, shared_with_email)
);

-- Tabel pentru comentarii pe analize
CREATE TABLE IF NOT EXISTS public.analysis_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analysis_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies pentru analysis_shares
CREATE POLICY "Users can view shares for their analyses"
  ON public.analysis_shares FOR SELECT
  USING (
    auth.uid() = owner_id OR 
    auth.uid() = shared_with_user_id OR
    (SELECT email FROM public.profiles WHERE id = auth.uid()) = shared_with_email
  );

CREATE POLICY "Users can create shares for own analyses"
  ON public.analysis_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analyses 
      WHERE id = analysis_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete shares for own analyses"
  ON public.analysis_shares FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses 
      WHERE id = analysis_id AND user_id = auth.uid()
    )
  );

-- RLS Policies pentru analysis_comments
CREATE POLICY "Users can view comments on accessible analyses"
  ON public.analysis_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses WHERE id = analysis_id AND user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.analysis_shares 
      WHERE analysis_id = analysis_comments.analysis_id 
      AND (shared_with_user_id = auth.uid() OR shared_with_email = (SELECT email FROM public.profiles WHERE id = auth.uid()))
    )
  );

CREATE POLICY "Users can create comments on accessible analyses"
  ON public.analysis_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      EXISTS (
        SELECT 1 FROM public.analyses WHERE id = analysis_id AND user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.analysis_shares 
        WHERE analysis_id = analysis_comments.analysis_id 
        AND permission IN ('comment', 'edit')
        AND (shared_with_user_id = auth.uid() OR shared_with_email = (SELECT email FROM public.profiles WHERE id = auth.uid()))
      )
    )
  );

CREATE POLICY "Users can update own comments"
  ON public.analysis_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.analysis_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger pentru updated_at
CREATE TRIGGER update_analysis_comments_updated_at
  BEFORE UPDATE ON public.analysis_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index pentru performance
CREATE INDEX idx_analysis_shares_analysis_id ON public.analysis_shares(analysis_id);
CREATE INDEX idx_analysis_shares_shared_with ON public.analysis_shares(shared_with_email);
CREATE INDEX idx_analysis_comments_analysis_id ON public.analysis_comments(analysis_id);
CREATE INDEX idx_analysis_comments_user_id ON public.analysis_comments(user_id);