
-- Outreach leads table
CREATE TABLE public.outreach_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  website TEXT,
  industry TEXT,
  city TEXT,
  cui TEXT,
  source TEXT NOT NULL DEFAULT 'google',
  status TEXT NOT NULL DEFAULT 'new',
  email_sent_at TIMESTAMPTZ,
  email_subject TEXT,
  email_content TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Outreach unsubscribes table
CREATE TABLE public.outreach_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.outreach_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Admin-only policies using has_role function
CREATE POLICY "Admins can manage outreach_leads"
ON public.outreach_leads
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage outreach_unsubscribes"
ON public.outreach_unsubscribes
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role needs access for edge functions
CREATE POLICY "Service role full access outreach_leads"
ON public.outreach_leads
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role full access outreach_unsubscribes"
ON public.outreach_unsubscribes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
