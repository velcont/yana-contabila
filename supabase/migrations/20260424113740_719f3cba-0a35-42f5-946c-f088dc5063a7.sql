
-- Tabel istoric emailuri trimise de Yana
CREATE TABLE public.outbound_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  attachment_name TEXT,
  attachment_size_bytes INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  error_message TEXT,
  triggered_via TEXT DEFAULT 'yana_agent',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_outbound_emails_user_id ON public.outbound_emails(user_id, created_at DESC);
CREATE INDEX idx_outbound_emails_recipient ON public.outbound_emails(user_id, recipient_email);

ALTER TABLE public.outbound_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own outbound emails"
ON public.outbound_emails FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own outbound emails"
ON public.outbound_emails FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own outbound emails"
ON public.outbound_emails FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own outbound emails"
ON public.outbound_emails FOR DELETE
USING (auth.uid() = user_id);

-- Tabel destinatari de încredere (skip confirmation)
CREATE TABLE public.email_trusted_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, email)
);

CREATE INDEX idx_trusted_recipients_user ON public.email_trusted_recipients(user_id);

ALTER TABLE public.email_trusted_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own trusted recipients select"
ON public.email_trusted_recipients FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users manage own trusted recipients insert"
ON public.email_trusted_recipients FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own trusted recipients update"
ON public.email_trusted_recipients FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users manage own trusted recipients delete"
ON public.email_trusted_recipients FOR DELETE
USING (auth.uid() = user_id);
