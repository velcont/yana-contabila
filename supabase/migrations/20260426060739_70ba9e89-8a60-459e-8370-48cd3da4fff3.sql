-- Tabel pentru lead-uri prospect din ONRC
CREATE TABLE public.prospect_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Date firma (din ONRC)
  company_name TEXT NOT NULL,
  cui TEXT,
  registration_number TEXT,
  county TEXT,
  city TEXT,
  registration_date DATE,
  caen_code TEXT,
  caen_description TEXT,
  
  -- Email găsit (din Perplexity)
  email TEXT,
  email_source TEXT,
  email_confidence TEXT CHECK (email_confidence IN ('high', 'medium', 'low', 'unknown')),
  website TEXT,
  
  -- Status flow
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN (
    'pending_review',     -- nou, așteaptă review
    'approved',           -- aprobat, gata de trimis
    'sent',               -- email trimis manual din Gmail
    'follow_up_due',      -- la 7 zile după sent → follow-up
    'follow_up_sent',     -- follow-up trimis
    'replied',            -- a răspuns
    'converted',          -- a devenit client
    'rejected',           -- respins de user
    'no_email_found',     -- nu am găsit email
    'unsubscribed'        -- a cerut să nu mai primească
  )),
  
  -- Draft emails
  initial_email_subject TEXT,
  initial_email_body TEXT,
  follow_up_subject TEXT,
  follow_up_body TEXT,
  
  -- Tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  follow_up_sent_at TIMESTAMP WITH TIME ZONE,
  follow_up_due_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  -- Metadata
  raw_onrc_data JSONB DEFAULT '{}'::jsonb,
  raw_email_search_data JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, cui)
);

-- Indexuri
CREATE INDEX idx_prospect_leads_user_status ON public.prospect_leads(user_id, status);
CREATE INDEX idx_prospect_leads_created ON public.prospect_leads(created_at DESC);
CREATE INDEX idx_prospect_leads_follow_up ON public.prospect_leads(follow_up_due_at) WHERE status = 'sent';
CREATE INDEX idx_prospect_leads_cui ON public.prospect_leads(cui);

-- RLS
ALTER TABLE public.prospect_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own prospect leads"
  ON public.prospect_leads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own prospect leads"
  ON public.prospect_leads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own prospect leads"
  ON public.prospect_leads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete their own prospect leads"
  ON public.prospect_leads FOR DELETE
  USING (auth.uid() = user_id);

-- Service role poate insera (pentru cron)
CREATE POLICY "Service role full access to prospect leads"
  ON public.prospect_leads FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Trigger updated_at
CREATE TRIGGER update_prospect_leads_updated_at
  BEFORE UPDATE ON public.prospect_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger automat: când status devine 'sent', setează follow_up_due_at la +7 zile
CREATE OR REPLACE FUNCTION public.set_prospect_followup_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'sent' AND OLD.status != 'sent' THEN
    NEW.sent_at = COALESCE(NEW.sent_at, now());
    NEW.follow_up_due_at = NEW.sent_at + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_prospect_followup_trigger
  BEFORE UPDATE ON public.prospect_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_prospect_followup_date();