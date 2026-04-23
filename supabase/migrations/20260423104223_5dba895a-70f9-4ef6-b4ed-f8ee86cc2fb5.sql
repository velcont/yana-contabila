-- Drop old wa-bot tables (legacy local-bot approach)
DROP TABLE IF EXISTS public.wa_bot_messages CASCADE;
DROP TABLE IF EXISTS public.wa_bot_status CASCADE;
DROP TABLE IF EXISTS public.wa_bot_config CASCADE;
DROP FUNCTION IF EXISTS public.increment_wa_message_counters(uuid) CASCADE;

-- New: link a user to their verified WhatsApp number
CREATE TABLE public.wa_user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  phone_e164 TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  otp_attempts INT NOT NULL DEFAULT 0,
  verified_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_wa_user_links_phone_verified
  ON public.wa_user_links(phone_e164) WHERE verified = true;

ALTER TABLE public.wa_user_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wa link"
  ON public.wa_user_links FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own wa link"
  ON public.wa_user_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own wa link"
  ON public.wa_user_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own wa link"
  ON public.wa_user_links FOR DELETE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_wa_user_links_updated
  BEFORE UPDATE ON public.wa_user_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Message log
CREATE TABLE public.wa_messages_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  phone_e164 TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  body TEXT,
  wa_message_id TEXT,
  status TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_messages_log_user ON public.wa_messages_log(user_id, created_at DESC);
CREATE INDEX idx_wa_messages_log_phone ON public.wa_messages_log(phone_e164, created_at DESC);

ALTER TABLE public.wa_messages_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wa messages"
  ON public.wa_messages_log FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));