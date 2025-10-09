-- Creare enum pentru tipuri de impozitare
CREATE TYPE public.tax_type AS ENUM ('profit', 'micro', 'dividend', 'norma_venit');

-- Creare tabel companies pentru date firme
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  cif TEXT,
  vat_payer BOOLEAN DEFAULT false,
  tax_type public.tax_type,
  registration_number TEXT,
  address TEXT,
  phone TEXT,
  contact_person TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, cif)
);

-- Adăugare coloană company_id în analyses pentru legătură cu companies
ALTER TABLE public.analyses 
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Index pentru căutări rapide
CREATE INDEX idx_companies_user_id ON public.companies(user_id);
CREATE INDEX idx_companies_cif ON public.companies(cif);
CREATE INDEX idx_companies_vat_payer ON public.companies(vat_payer);
CREATE INDEX idx_companies_tax_type ON public.companies(tax_type);
CREATE INDEX idx_analyses_company_id ON public.analyses(company_id);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies pentru companies
CREATE POLICY "Users can view own companies"
ON public.companies
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own companies"
ON public.companies
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own companies"
ON public.companies
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own companies"
ON public.companies
FOR DELETE
USING (auth.uid() = user_id);

-- Admins pot vedea toate companiile
CREATE POLICY "Admins can view all companies"
ON public.companies
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger pentru updated_at
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabel pentru email broadcasts (campanii email)
CREATE TABLE public.email_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_to_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  filter_criteria JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS pentru email_broadcasts
ALTER TABLE public.email_broadcasts ENABLE ROW LEVEL SECURITY;

-- Doar adminii pot crea și vedea broadcast-uri
CREATE POLICY "Admins can manage broadcasts"
ON public.email_broadcasts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));