-- Add trial and free access fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS has_free_access boolean DEFAULT false;

-- Set trial period for all existing users without subscription (3 months from account creation)
UPDATE public.profiles
SET trial_ends_at = created_at + interval '3 months'
WHERE subscription_status = 'inactive' 
  AND trial_ends_at IS NULL;

-- Set all users without subscription_type to entrepreneur
UPDATE public.profiles
SET subscription_type = 'entrepreneur'
WHERE subscription_type IS NULL;

-- Create index for faster trial queries
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at ON public.profiles(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_type ON public.profiles(subscription_type);

COMMENT ON COLUMN public.profiles.trial_ends_at IS 'Data de expirare a perioadei de testare (3 luni de la înregistrare)';
COMMENT ON COLUMN public.profiles.has_free_access IS 'Acces gratuit permanent acordat de admin (pentru cazuri speciale)';