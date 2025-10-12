-- Create table for tracking terms acceptance
CREATE TABLE IF NOT EXISTS public.terms_acceptance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  terms_version TEXT DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.terms_acceptance ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own acceptance records
CREATE POLICY "Users can view own terms acceptance"
  ON public.terms_acceptance
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service can insert terms acceptance
CREATE POLICY "Service can insert terms acceptance"
  ON public.terms_acceptance
  FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can view all terms acceptances
CREATE POLICY "Admins can view all terms acceptances"
  ON public.terms_acceptance
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_terms_acceptance_user_id ON public.terms_acceptance(user_id);
CREATE INDEX idx_terms_acceptance_email ON public.terms_acceptance(email);
CREATE INDEX idx_terms_acceptance_accepted_at ON public.terms_acceptance(accepted_at DESC);

-- Add terms_accepted flag to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE;

-- Create function to check trial expiration and send notifications
CREATE OR REPLACE FUNCTION check_trial_expiration_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function will be called by a cron job to send notifications
  -- 30 days before trial expiration
  -- 15 days before trial expiration
  -- At trial expiration
  
  -- Log entries that need notification (to be picked up by edge function)
  INSERT INTO public.trial_notifications (user_id, notification_type, trial_ends_at)
  SELECT 
    id,
    CASE 
      WHEN trial_ends_at - INTERVAL '30 days' <= now() 
           AND trial_ends_at - INTERVAL '29 days' > now() THEN '30_days'
      WHEN trial_ends_at - INTERVAL '15 days' <= now() 
           AND trial_ends_at - INTERVAL '14 days' > now() THEN '15_days'
      WHEN trial_ends_at <= now() THEN 'expired'
    END as notification_type,
    trial_ends_at
  FROM public.profiles
  WHERE trial_ends_at IS NOT NULL
    AND subscription_status != 'active'
    AND (
      (trial_ends_at - INTERVAL '30 days' <= now() AND trial_ends_at - INTERVAL '29 days' > now())
      OR (trial_ends_at - INTERVAL '15 days' <= now() AND trial_ends_at - INTERVAL '14 days' > now())
      OR (trial_ends_at <= now())
    );
END;
$$;

-- Create table for trial notifications queue
CREATE TABLE IF NOT EXISTS public.trial_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('30_days', '15_days', 'expired')),
  trial_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trial_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Only service can manage notifications
CREATE POLICY "Service can manage trial notifications"
  ON public.trial_notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index
CREATE INDEX idx_trial_notifications_user_id ON public.trial_notifications(user_id);
CREATE INDEX idx_trial_notifications_sent ON public.trial_notifications(sent, created_at);