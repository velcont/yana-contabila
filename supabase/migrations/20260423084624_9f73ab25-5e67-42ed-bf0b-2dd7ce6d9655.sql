-- Email accounts per user (IMAP/SMTP config + encrypted password)
CREATE TABLE IF NOT EXISTS public.user_email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  display_name TEXT,
  -- IMAP
  imap_host TEXT NOT NULL,
  imap_port INTEGER NOT NULL DEFAULT 993,
  imap_use_ssl BOOLEAN NOT NULL DEFAULT true,
  -- SMTP
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 465,
  smtp_use_ssl BOOLEAN NOT NULL DEFAULT true,
  -- Auth
  username TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,  -- AES-GCM ciphertext (base64)
  encryption_iv TEXT NOT NULL,       -- IV used for encryption (base64)
  -- Meta
  signature TEXT,
  is_default BOOLEAN NOT NULL DEFAULT true,
  last_test_status TEXT,
  last_test_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, email_address)
);

ALTER TABLE public.user_email_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own email accounts"
  ON public.user_email_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own email accounts"
  ON public.user_email_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own email accounts"
  ON public.user_email_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own email accounts"
  ON public.user_email_accounts FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_uea_updated_at
  BEFORE UPDATE ON public.user_email_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Drafts
CREATE TABLE IF NOT EXISTS public.email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.user_email_accounts(id) ON DELETE CASCADE,
  to_addresses TEXT[] NOT NULL DEFAULT '{}',
  cc_addresses TEXT[] NOT NULL DEFAULT '{}',
  bcc_addresses TEXT[] NOT NULL DEFAULT '{}',
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  in_reply_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own drafts"
  ON public.email_drafts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own drafts"
  ON public.email_drafts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own drafts"
  ON public.email_drafts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own drafts"
  ON public.email_drafts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_drafts_updated_at
  BEFORE UPDATE ON public.email_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_uea_user ON public.user_email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_drafts_user ON public.email_drafts(user_id);