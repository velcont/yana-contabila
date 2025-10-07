-- Tabel pentru stocarea update-urilor aplicației
CREATE TABLE public.app_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  version TEXT,
  is_published BOOLEAN DEFAULT false,
  include_in_next_email BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

-- Admin poate vedea toate update-urile
CREATE POLICY "Admins can view all updates"
ON public.app_updates
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin poate crea update-uri
CREATE POLICY "Admins can create updates"
ON public.app_updates
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin poate edita update-uri
CREATE POLICY "Admins can update updates"
ON public.app_updates
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin poate șterge update-uri
CREATE POLICY "Admins can delete updates"
ON public.app_updates
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Tabel pentru log-ul de email-uri trimise
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'sent',
  metadata JSONB
);

-- Enable RLS pentru email logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Admin poate vedea toate log-urile
CREATE POLICY "Admins can view email logs"
ON public.email_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));