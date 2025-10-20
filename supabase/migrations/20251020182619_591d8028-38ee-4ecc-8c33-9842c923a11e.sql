-- Set default trial duration to 30 days instead of 3 months
ALTER TABLE public.profiles
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + INTERVAL '30 days');

-- Update comment to reflect the correct duration
COMMENT ON COLUMN public.profiles.trial_ends_at IS 'Data de expirare a perioadei de testare (30 zile de la înregistrare)';

-- Fix any existing records where trial was set to more than 35 days (e.g., 3 months)
UPDATE public.profiles
SET trial_ends_at = created_at + INTERVAL '30 days'
WHERE trial_ends_at IS NOT NULL
  AND trial_ends_at > created_at + INTERVAL '35 days';