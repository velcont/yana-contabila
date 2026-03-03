
-- Add onboarding_completed column to yana_client_profiles
ALTER TABLE public.yana_client_profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Add onboarding_answers to store the raw answers
ALTER TABLE public.yana_client_profiles 
ADD COLUMN IF NOT EXISTS onboarding_answers jsonb DEFAULT NULL;
