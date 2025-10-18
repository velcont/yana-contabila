-- Creează tabelă pentru audit și conformitate GDPR - utilizatori șterși
CREATE TABLE IF NOT EXISTS public.deleted_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_user_id UUID NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  subscription_type TEXT,
  subscription_status TEXT,
  deletion_reason TEXT,
  deleted_by UUID REFERENCES auth.users(id),
  deleted_by_email TEXT,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL
);

-- Index pentru căutare rapidă
CREATE INDEX idx_deleted_users_email ON public.deleted_users(email);
CREATE INDEX idx_deleted_users_deleted_at ON public.deleted_users(deleted_at DESC);
CREATE INDEX idx_deleted_users_original_id ON public.deleted_users(original_user_id);

-- Enable RLS
ALTER TABLE public.deleted_users ENABLE ROW LEVEL SECURITY;

-- Policy: doar adminii pot vedea utilizatorii șterși
CREATE POLICY "Admins can view deleted users"
ON public.deleted_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Policy: serviciile backend pot insera (pentru funcția de delete)
CREATE POLICY "Service can insert deleted users"
ON public.deleted_users
FOR INSERT
WITH CHECK (true);

-- Comentarii pentru documentație
COMMENT ON TABLE public.deleted_users IS 'Audit trail pentru utilizatorii șterși - necesar pentru conformitate GDPR și legală';
COMMENT ON COLUMN public.deleted_users.original_user_id IS 'ID-ul original al utilizatorului înainte de ștergere';
COMMENT ON COLUMN public.deleted_users.deletion_reason IS 'Motivul ștergerii (admin request, user request, etc.)';
COMMENT ON COLUMN public.deleted_users.user_metadata IS 'Metadate suplimentare despre utilizator la momentul ștergerii';