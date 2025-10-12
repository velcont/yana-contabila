-- Create subscription type enum
CREATE TYPE subscription_type AS ENUM ('entrepreneur', 'accounting_firm');

-- Add subscription columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN subscription_type subscription_type DEFAULT 'entrepreneur',
ADD COLUMN subscription_status text DEFAULT 'inactive',
ADD COLUMN stripe_customer_id text,
ADD COLUMN stripe_subscription_id text,
ADD COLUMN subscription_ends_at timestamp with time zone;

-- Add company management fields to companies table
ALTER TABLE public.companies
ADD COLUMN managed_by_accountant_id uuid REFERENCES public.profiles(id),
ADD COLUMN is_own_company boolean DEFAULT true,
ADD COLUMN accountant_logo_url text,
ADD COLUMN accountant_brand_color text;

-- Create table for accountant-client invitations
CREATE TABLE public.accountant_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_email text NOT NULL,
  client_name text,
  company_name text NOT NULL,
  invitation_token uuid DEFAULT gen_random_uuid(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days'),
  accepted_at timestamp with time zone
);

-- Enable RLS on accountant_invitations
ALTER TABLE public.accountant_invitations ENABLE ROW LEVEL SECURITY;

-- Accountants can view their own invitations
CREATE POLICY "Accountants can view own invitations"
ON public.accountant_invitations FOR SELECT
USING (auth.uid() = accountant_id);

-- Accountants can create invitations
CREATE POLICY "Accountants can create invitations"
ON public.accountant_invitations FOR INSERT
WITH CHECK (
  auth.uid() = accountant_id AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND subscription_type = 'accounting_firm'
    AND subscription_status = 'active'
  )
);

-- Accountants can update their invitations
CREATE POLICY "Accountants can update own invitations"
ON public.accountant_invitations FOR UPDATE
USING (auth.uid() = accountant_id);

-- Update companies policies to allow accountants to see their clients' companies
CREATE POLICY "Accountants can view managed companies"
ON public.companies FOR SELECT
USING (
  auth.uid() = managed_by_accountant_id OR
  auth.uid() = user_id OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Update analyses policies to allow accountants to see their clients' analyses
CREATE POLICY "Accountants can view clients analyses"
ON public.analyses FOR SELECT
USING (
  auth.uid() = user_id OR
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.companies
    WHERE companies.id = analyses.company_id
    AND companies.managed_by_accountant_id = auth.uid()
  )
);

-- Create subscription plans table
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type subscription_type NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_monthly_eur numeric NOT NULL,
  stripe_price_id text,
  features jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on subscription_plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can view plans
CREATE POLICY "Anyone can view subscription plans"
ON public.subscription_plans FOR SELECT
USING (true);

-- Only admins can modify plans
CREATE POLICY "Admins can manage subscription plans"
ON public.subscription_plans FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default plans
INSERT INTO public.subscription_plans (plan_type, name, description, price_monthly_eur, features)
VALUES 
(
  'entrepreneur',
  'Plan Antreprenor',
  'Perfect pentru gestionarea propriei firme',
  12.00,
  '["Încărcare balanță", "Analiză AI automată", "Verificări contabile de bază", "Rapoarte PDF", "Chat AI", "Istoric analize"]'::jsonb
),
(
  'accounting_firm',
  'Plan Firmă Contabilitate',
  'Soluție completă pentru firme de contabilitate',
  30.00,
  '["Toate funcționalitățile Plan Antreprenor", "Clienți nelimitați", "Dashboard multi-client", "Sistem invitații", "Branding personalizat", "Raportare automată", "Verificări contabile avansate"]'::jsonb
);