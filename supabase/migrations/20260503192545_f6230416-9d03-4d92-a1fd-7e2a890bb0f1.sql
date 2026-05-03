
-- ============================================
-- SAMANTA VOICE RECEPTIONIST — Schema
-- ============================================

-- Settings table
CREATE TABLE public.samanta_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  schedule jsonb NOT NULL DEFAULT '{"mode":"24_7"}'::jsonb,
  voice_agent_id text NOT NULL DEFAULT 'agent_0701kqqhjszgfras171457cctcjy',
  twilio_phone_number text,
  forward_to_user_phone text,
  escalation_keywords text[] NOT NULL DEFAULT ARRAY['urgent','anaf','amenda','control','procuror','executor','avocat']::text[],
  language text NOT NULL DEFAULT 'ro',
  greeting text DEFAULT 'Bună ziua, sunt Samanta, asistenta personală. Cu ce vă pot ajuta?',
  user_full_name text,
  company_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.samanta_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own samanta settings"
  ON public.samanta_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own samanta settings"
  ON public.samanta_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own samanta settings"
  ON public.samanta_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own samanta settings"
  ON public.samanta_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Calls table
CREATE TABLE public.samanta_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  twilio_call_sid text UNIQUE,
  from_number text NOT NULL,
  to_number text NOT NULL,
  direction text NOT NULL DEFAULT 'inbound',
  contact_id uuid,
  contact_name text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_seconds integer,
  status text NOT NULL DEFAULT 'in_progress',
  transcript jsonb DEFAULT '[]'::jsonb,
  summary text,
  escalation_needed boolean NOT NULL DEFAULT false,
  recording_url text,
  elevenlabs_conversation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_samanta_calls_user ON public.samanta_calls(user_id, created_at DESC);
CREATE INDEX idx_samanta_calls_status ON public.samanta_calls(user_id, status);

ALTER TABLE public.samanta_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own samanta calls"
  ON public.samanta_calls FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own samanta calls"
  ON public.samanta_calls FOR DELETE
  USING (auth.uid() = user_id);

-- (No INSERT/UPDATE policy — only edge functions via service role write here)

-- Callbacks table
CREATE TABLE public.samanta_callbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_id uuid REFERENCES public.samanta_calls(id) ON DELETE SET NULL,
  contact_name text,
  contact_phone text NOT NULL,
  scheduled_for timestamptz,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_samanta_callbacks_user ON public.samanta_callbacks(user_id, status, scheduled_for);

ALTER TABLE public.samanta_callbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own samanta callbacks"
  ON public.samanta_callbacks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own samanta callbacks"
  ON public.samanta_callbacks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own samanta callbacks"
  ON public.samanta_callbacks FOR DELETE
  USING (auth.uid() = user_id);

-- Blocked numbers
CREATE TABLE public.samanta_blocked_numbers (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, phone_number)
);

ALTER TABLE public.samanta_blocked_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own blocked numbers"
  ON public.samanta_blocked_numbers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- updated_at triggers
CREATE TRIGGER update_samanta_settings_updated_at
  BEFORE UPDATE ON public.samanta_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_samanta_callbacks_updated_at
  BEFORE UPDATE ON public.samanta_callbacks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.samanta_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.samanta_callbacks;
ALTER TABLE public.samanta_calls REPLICA IDENTITY FULL;
ALTER TABLE public.samanta_callbacks REPLICA IDENTITY FULL;
