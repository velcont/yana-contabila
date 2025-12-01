-- Add ai_credits column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ai_credits INTEGER DEFAULT 0 NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_ai_credits ON public.profiles(ai_credits);

-- Set initial AI credits for existing premium users (1000 cents = 10 RON)
UPDATE public.profiles 
SET ai_credits = 1000 
WHERE subscription_status = 'active' 
  AND subscription_type IN ('entrepreneur', 'accounting_firm')
  AND ai_credits = 0;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.ai_credits IS 'AI credits balance in cents (100 cents = 1 RON). Used for premium AI features like Strategic Advisor, Voice Interface, etc.';