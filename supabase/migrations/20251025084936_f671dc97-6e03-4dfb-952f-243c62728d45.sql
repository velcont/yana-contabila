-- ETAPA 1: Marketplace de Servicii Complementare + Onboarding Automatizat

-- ============================================
-- PARTEA 1: MARKETPLACE DE SERVICII
-- ============================================

-- Tabela service_providers (furnizori de servicii complementare)
CREATE TABLE public.service_providers (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  provider_type text NOT NULL CHECK (provider_type IN ('lawyer', 'auditor', 'tax_consultant', 'business_consultant', 'other')),
  company_name text NOT NULL,
  contact_person text,
  email text NOT NULL UNIQUE,
  phone text,
  description text,
  specializations jsonb DEFAULT '[]'::jsonb,
  commission_rate numeric(4, 2) DEFAULT 0.00 NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  is_verified boolean DEFAULT false NOT NULL,
  rating numeric(3, 2) CHECK (rating >= 0 AND rating <= 5),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin full access to service providers" 
ON public.service_providers
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Allow accountants to read verified providers" 
ON public.service_providers
FOR SELECT 
USING (is_verified = true);

-- Tabela service_recommendations (recomandări trimise către clienți)
CREATE TABLE public.service_recommendations (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  accountant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.service_providers(id) ON DELETE CASCADE,
  service_description text,
  status text DEFAULT 'sent' NOT NULL CHECK (status IN ('sent', 'accepted', 'completed', 'cancelled')),
  commission_amount numeric(10, 2),
  commission_paid boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.service_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow accountants to manage own recommendations"
ON public.service_recommendations 
FOR ALL 
USING (auth.uid() = accountant_id);

CREATE POLICY "Allow admins full view for commission tracking"
ON public.service_recommendations 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- PARTEA 2: ONBOARDING AUTOMATIZAT
-- ============================================

-- Tabela onboarding_processes (șabloane de procese onboarding)
CREATE TABLE public.onboarding_processes (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  accountant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  process_name text NOT NULL,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.onboarding_processes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accountants can manage own onboarding processes"
ON public.onboarding_processes 
FOR ALL 
USING (auth.uid() = accountant_id);

CREATE POLICY "Admins can view all onboarding processes"
ON public.onboarding_processes 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela onboarding_steps_progress (progresul clienților în procesul de onboarding)
CREATE TABLE public.onboarding_steps_progress (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  process_id uuid NOT NULL REFERENCES public.onboarding_processes(id) ON DELETE CASCADE,
  client_company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  completed boolean DEFAULT false NOT NULL,
  completed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.onboarding_steps_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accountants can view client onboarding progress"
ON public.onboarding_steps_progress 
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = client_company_id 
    AND c.managed_by_accountant_id = auth.uid()
  )
);

CREATE POLICY "Service can insert onboarding progress"
ON public.onboarding_steps_progress 
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Clients can update own onboarding progress"
ON public.onboarding_steps_progress 
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = client_company_id 
    AND c.user_id = auth.uid()
  )
);

-- Trigger pentru updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_etapa1()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_service_providers_updated_at
BEFORE UPDATE ON public.service_providers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_etapa1();

CREATE TRIGGER update_service_recommendations_updated_at
BEFORE UPDATE ON public.service_recommendations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_etapa1();

CREATE TRIGGER update_onboarding_processes_updated_at
BEFORE UPDATE ON public.onboarding_processes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_etapa1();

CREATE TRIGGER update_onboarding_steps_progress_updated_at
BEFORE UPDATE ON public.onboarding_steps_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_etapa1();