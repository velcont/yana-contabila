
-- Modul Firme Noi Înființate

CREATE TABLE public.new_companies_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  uploaded_by UUID,
  total_rows INTEGER DEFAULT 0,
  inserted_rows INTEGER DEFAULT 0,
  duplicate_rows INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.new_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.new_companies_batches(id) ON DELETE SET NULL,
  cui TEXT NOT NULL UNIQUE,
  nr_inmatriculare TEXT,
  nume TEXT NOT NULL,
  judet TEXT,
  localitate TEXT,
  tip TEXT,
  adresa TEXT,
  nr TEXT,
  telefon TEXT,
  mobil TEXT,
  fax TEXT,
  data_infiintarii DATE,
  data_actualizarii DATE,
  caen TEXT,
  descriere_caen TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_new_companies_judet ON public.new_companies(judet);
CREATE INDEX idx_new_companies_caen ON public.new_companies(caen);
CREATE INDEX idx_new_companies_data ON public.new_companies(data_infiintarii DESC);
CREATE INDEX idx_new_companies_batch ON public.new_companies(batch_id);

CREATE TABLE public.new_company_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  new_company_id UUID NOT NULL REFERENCES public.new_companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'viewed',
  email_subject TEXT,
  email_body TEXT,
  crm_company_id UUID,
  crm_deal_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, new_company_id)
);

-- Helper: acces firme noi
CREATE OR REPLACE FUNCTION public.has_firme_noi_access(_uid UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _uid AND (
      public.has_role(_uid, 'admin'::app_role)
      OR p.has_free_access = true
      OR (p.trial_ends_at IS NOT NULL AND p.trial_ends_at > now())
      OR (p.subscription_status = 'active' AND (p.subscription_ends_at IS NULL OR p.subscription_ends_at > now()))
    )
  );
$$;

ALTER TABLE public.new_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_companies_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_company_outreach ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view firme noi if access" ON public.new_companies
  FOR SELECT USING (public.has_firme_noi_access(auth.uid()));
CREATE POLICY "admin manage firme noi" ON public.new_companies
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "view batches if access" ON public.new_companies_batches
  FOR SELECT USING (public.has_firme_noi_access(auth.uid()));
CREATE POLICY "admin manage batches" ON public.new_companies_batches
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user own outreach select" ON public.new_company_outreach
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user own outreach insert" ON public.new_company_outreach
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_firme_noi_access(auth.uid()));
CREATE POLICY "user own outreach update" ON public.new_company_outreach
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER trg_outreach_updated
  BEFORE UPDATE ON public.new_company_outreach
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket pentru xlsx-uri (privat, doar admin via service role)
INSERT INTO storage.buckets (id, name, public)
VALUES ('firme-noi-uploads', 'firme-noi-uploads', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "admin upload firme noi xlsx" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'firme-noi-uploads' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin read firme noi xlsx" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'firme-noi-uploads' AND public.has_role(auth.uid(), 'admin'::app_role));
