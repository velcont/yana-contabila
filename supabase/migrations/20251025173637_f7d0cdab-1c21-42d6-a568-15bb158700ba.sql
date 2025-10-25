-- Migration 2: Create Monthly Workflow System
-- Obiectiv: Sistem complet de urmărire dosare lunare pentru toți contabilii

-- TABEL 1: workflow_team_members
-- Stochează membrii echipei contabilului (FĂRĂ cont în aplicație)
CREATE TABLE IF NOT EXISTS public.workflow_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_email TEXT NOT NULL,
  member_role TEXT NOT NULL CHECK (member_role IN ('receptionist', 'junior_accountant', 'hr_accountant', 'senior_accountant', 'declarations_accountant')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(accountant_id, member_email)
);

-- RLS pentru workflow_team_members
ALTER TABLE public.workflow_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accountants can manage own team members"
ON public.workflow_team_members
FOR ALL
TO authenticated
USING (auth.uid() = accountant_id)
WITH CHECK (auth.uid() = accountant_id);

CREATE POLICY "Admins can view all team members"
ON public.workflow_team_members
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Index pentru workflow_team_members
CREATE INDEX idx_team_members_accountant ON public.workflow_team_members(accountant_id);

-- Trigger pentru updated_at
CREATE TRIGGER update_workflow_team_members_updated_at
BEFORE UPDATE ON public.workflow_team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- TABEL 2: monthly_workflow_templates
-- Șabloane de workflow customizabile per contabil
CREATE TABLE IF NOT EXISTS public.monthly_workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS pentru monthly_workflow_templates
ALTER TABLE public.monthly_workflow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accountants can manage own templates"
ON public.monthly_workflow_templates
FOR ALL
TO authenticated
USING (auth.uid() = accountant_id)
WITH CHECK (auth.uid() = accountant_id);

CREATE POLICY "Admins can view all templates"
ON public.monthly_workflow_templates
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger pentru updated_at
CREATE TRIGGER update_workflow_templates_updated_at
BEFORE UPDATE ON public.monthly_workflow_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- TABEL 3: monthly_workflow_instances
-- Instanțe de workflow per companie + lună
CREATE TABLE IF NOT EXISTS public.monthly_workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.monthly_workflow_templates(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  accountant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  overall_status TEXT NOT NULL DEFAULT 'not_started' CHECK (overall_status IN ('not_started', 'in_progress', 'completed', 'overdue')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(company_id, month_year)
);

-- RLS pentru monthly_workflow_instances
ALTER TABLE public.monthly_workflow_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accountants can manage workflows for own companies"
ON public.monthly_workflow_instances
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = monthly_workflow_instances.company_id
    AND c.managed_by_accountant_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = monthly_workflow_instances.company_id
    AND c.managed_by_accountant_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all workflow instances"
ON public.monthly_workflow_instances
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Indexuri pentru monthly_workflow_instances
CREATE INDEX idx_workflow_instances_month ON public.monthly_workflow_instances(month_year);
CREATE INDEX idx_workflow_instances_company ON public.monthly_workflow_instances(company_id);
CREATE INDEX idx_workflow_instances_accountant ON public.monthly_workflow_instances(accountant_id);
CREATE INDEX idx_workflow_instances_status ON public.monthly_workflow_instances(overall_status);

-- Trigger pentru updated_at
CREATE TRIGGER update_workflow_instances_updated_at
BEFORE UPDATE ON public.monthly_workflow_instances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- TABEL 4: monthly_workflow_stages
-- Etapele individuale pentru fiecare workflow instance
CREATE TABLE IF NOT EXISTS public.monthly_workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID NOT NULL REFERENCES public.monthly_workflow_instances(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 5),
  stage_name TEXT NOT NULL,
  responsible_person_id UUID REFERENCES public.workflow_team_members(id) ON DELETE SET NULL,
  responsible_person_name TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_days INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workflow_instance_id, stage_number)
);

-- RLS pentru monthly_workflow_stages
ALTER TABLE public.monthly_workflow_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accountants can manage stages for own workflows"
ON public.monthly_workflow_stages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.monthly_workflow_instances wi
    JOIN public.companies c ON c.id = wi.company_id
    WHERE wi.id = monthly_workflow_stages.workflow_instance_id
    AND c.managed_by_accountant_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.monthly_workflow_instances wi
    JOIN public.companies c ON c.id = wi.company_id
    WHERE wi.id = monthly_workflow_stages.workflow_instance_id
    AND c.managed_by_accountant_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all workflow stages"
ON public.monthly_workflow_stages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Indexuri pentru monthly_workflow_stages
CREATE INDEX idx_workflow_stages_instance ON public.monthly_workflow_stages(workflow_instance_id);
CREATE INDEX idx_workflow_stages_responsible ON public.monthly_workflow_stages(responsible_person_id);
CREATE INDEX idx_workflow_stages_status ON public.monthly_workflow_stages(status);

-- Trigger pentru updated_at
CREATE TRIGGER update_workflow_stages_updated_at
BEFORE UPDATE ON public.monthly_workflow_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- TRIGGER: detect_overdue_workflow_stages
-- Detectare automată întârzieri și finalizare workflow
CREATE OR REPLACE FUNCTION public.detect_overdue_workflow_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  all_completed BOOLEAN;
BEGIN
  -- Detectare întârziere
  IF NEW.status = 'in_progress' AND NEW.started_at IS NOT NULL THEN
    IF NOW() > (NEW.started_at + (NEW.estimated_days || ' days')::INTERVAL) THEN
      UPDATE public.monthly_workflow_instances
      SET overall_status = 'overdue'
      WHERE id = NEW.workflow_instance_id
      AND overall_status != 'completed';
    END IF;
  END IF;

  -- Verificare finalizare completă workflow
  IF NEW.status = 'completed' THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM public.monthly_workflow_stages
      WHERE workflow_instance_id = NEW.workflow_instance_id
      AND status != 'completed'
    ) INTO all_completed;

    IF all_completed THEN
      UPDATE public.monthly_workflow_instances
      SET overall_status = 'completed',
          completed_at = NOW()
      WHERE id = NEW.workflow_instance_id;
    ELSE
      -- Dacă nu toate sunt completate, setează ca in_progress
      UPDATE public.monthly_workflow_instances
      SET overall_status = 'in_progress'
      WHERE id = NEW.workflow_instance_id
      AND overall_status = 'not_started';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_detect_overdue_workflow_stages
AFTER INSERT OR UPDATE ON public.monthly_workflow_stages
FOR EACH ROW
EXECUTE FUNCTION public.detect_overdue_workflow_stages();

-- FUNCTION: create_default_workflow_template_for_accountant
-- Creare automată șablon default la activare abonament accounting_firm
CREATE OR REPLACE FUNCTION public.create_default_workflow_template_for_accountant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifică dacă subscription_type a devenit 'accounting_firm' și subscription_status este 'active'
  IF NEW.subscription_type = 'accounting_firm' AND NEW.subscription_status = 'active' THEN
    -- Verifică dacă nu există deja un șablon default pentru acest contabil
    IF NOT EXISTS (
      SELECT 1 FROM public.monthly_workflow_templates
      WHERE accountant_id = NEW.id
      AND is_default = true
    ) THEN
      -- Creează șablonul default
      INSERT INTO public.monthly_workflow_templates (
        accountant_id,
        template_name,
        is_default,
        stages
      ) VALUES (
        NEW.id,
        'Proces Standard Lunar 2025',
        true,
        '[
          {
            "stage_number": 1,
            "stage_name": "PRIMIRE DOCUMENTE",
            "default_responsible_role": "receptionist",
            "estimated_days": 1,
            "start_message": "Preia actele de la client",
            "end_message": "Firma {company_name} a predat actele pentru {month_year}"
          },
          {
            "stage_number": 2,
            "stage_name": "INTRODUCERE ACTE PRIMARE",
            "default_responsible_role": "junior_accountant",
            "estimated_days": 3,
            "start_message": "Am început să introduc actele pe {month_year}",
            "end_message": "Am terminat actele primare pe {month_year}"
          },
          {
            "stage_number": 3,
            "stage_name": "SALARIZARE (HR)",
            "default_responsible_role": "hr_accountant",
            "estimated_days": 2,
            "start_message": "Am început să lucrez la contabilitatea RU pentru {month_year}",
            "end_message": "Am terminat salarizarea pentru {month_year}"
          },
          {
            "stage_number": 4,
            "stage_name": "VERIFICARE BALANȚĂ",
            "default_responsible_role": "senior_accountant",
            "estimated_days": 2,
            "start_message": "Am început să verific balanța pentru {month_year}",
            "end_message": "Am verificat balanța și închis dosarul {month_year}"
          },
          {
            "stage_number": 5,
            "stage_name": "DECLARAȚII",
            "default_responsible_role": "declarations_accountant",
            "estimated_days": 2,
            "start_message": "Am început să redactez declarațiile pentru {month_year}",
            "end_message": "Am depus declarațiile pentru {month_year}"
          }
        ]'::jsonb
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_default_workflow_template
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (NEW.subscription_type = 'accounting_firm' AND NEW.subscription_status = 'active')
EXECUTE FUNCTION public.create_default_workflow_template_for_accountant();