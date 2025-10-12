-- Add account_type_selected flag to profiles to prevent changing after first selection
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_type_selected BOOLEAN DEFAULT FALSE;

-- Add subscription fields to companies table for per-company subscriptions
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '3 months'),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add index for faster company subscription lookups
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON public.companies(subscription_status);
CREATE INDEX IF NOT EXISTS idx_companies_user_active ON public.companies(user_id, is_active);