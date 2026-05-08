
CREATE TABLE public.gmail_responder_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  mode TEXT NOT NULL DEFAULT 'draft' CHECK (mode IN ('draft','auto_whitelist','auto_all')),
  frequency_minutes INTEGER NOT NULL DEFAULT 5 CHECK (frequency_minutes BETWEEN 2 AND 60),
  system_prompt TEXT NOT NULL DEFAULT 'Ești un asistent profesional care redactează răspunsuri scurte, politicoase și clare la emailuri în limba română. Folosește semnătura configurată. Niciodată nu da sfaturi fiscale/juridice fără disclaimer „verificați cu un specialist". Dacă emailul cere o decizie urgentă/sensibilă, scrie un draft scurt care confirmă primirea și promite revenire.',
  signature TEXT DEFAULT '',
  blacklist TEXT[] NOT NULL DEFAULT ARRAY['noreply@','no-reply@','newsletter@','notifications@','mailer-daemon@','postmaster@'],
  whitelist TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  scope TEXT NOT NULL DEFAULT 'unseen_inbox',
  mark_as_read BOOLEAN NOT NULL DEFAULT false,
  last_run_at TIMESTAMPTZ,
  last_history_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gmail_responder_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings select" ON public.gmail_responder_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own settings insert" ON public.gmail_responder_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own settings update" ON public.gmail_responder_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own settings delete" ON public.gmail_responder_settings FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.gmail_responder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_message_id TEXT,
  thread_id TEXT,
  from_address TEXT,
  subject TEXT,
  snippet TEXT,
  generated_draft TEXT,
  gmail_draft_id TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_gmail_log_user_created ON public.gmail_responder_log(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_gmail_log_unique_msg ON public.gmail_responder_log(user_id, email_message_id) WHERE email_message_id IS NOT NULL;

ALTER TABLE public.gmail_responder_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own log select" ON public.gmail_responder_log FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE public.gmail_responder_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_email TEXT NOT NULL,
  final_response TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_gmail_examples_user ON public.gmail_responder_examples(user_id, created_at DESC);

ALTER TABLE public.gmail_responder_examples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own examples all" ON public.gmail_responder_examples FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_gmail_settings_updated BEFORE UPDATE ON public.gmail_responder_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
