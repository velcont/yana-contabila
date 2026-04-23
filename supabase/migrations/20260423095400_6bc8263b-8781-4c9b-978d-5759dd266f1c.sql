
-- Config per user
CREATE TABLE public.wa_bot_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  respond_in_groups BOOLEAN NOT NULL DEFAULT false,
  cooldown_seconds INTEGER NOT NULL DEFAULT 5,
  model TEXT NOT NULL DEFAULT 'claude-haiku-4-5',
  max_tokens INTEGER NOT NULL DEFAULT 400,
  system_prompt TEXT NOT NULL DEFAULT 'Esti asistentul AI al firmei pe WhatsApp. Raspunzi profesional, scurt (max 3-4 propozitii), prietenos, in limba romana.',
  keyword_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  bot_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  anthropic_key_set BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_wa_bot_config_token ON public.wa_bot_config(bot_token);

ALTER TABLE public.wa_bot_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_own_wa_config" ON public.wa_bot_config
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_insert_own_wa_config" ON public.wa_bot_config
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_own_wa_config" ON public.wa_bot_config
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_delete_own_wa_config" ON public.wa_bot_config
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_wa_bot_config_updated
  BEFORE UPDATE ON public.wa_bot_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Status / heartbeat
CREATE TABLE public.wa_bot_status (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_heartbeat_at TIMESTAMPTZ,
  device_info TEXT,
  total_messages_today INTEGER NOT NULL DEFAULT 0,
  total_messages_all_time INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_bot_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_own_wa_status" ON public.wa_bot_status
  FOR SELECT USING (auth.uid() = user_id);

-- Messages log
CREATE TABLE public.wa_bot_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL,
  contact_name TEXT,
  is_group BOOLEAN NOT NULL DEFAULT false,
  incoming_text TEXT NOT NULL,
  reply_text TEXT,
  reply_type TEXT NOT NULL DEFAULT 'ai',
  matched_keyword TEXT,
  tokens_used INTEGER,
  latency_ms INTEGER,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_messages_user_created ON public.wa_bot_messages(user_id, created_at DESC);

ALTER TABLE public.wa_bot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_own_wa_messages" ON public.wa_bot_messages
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_delete_own_wa_messages" ON public.wa_bot_messages
  FOR DELETE USING (auth.uid() = user_id);
