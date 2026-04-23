
-- Tabel pentru tokenele OAuth Google Calendar per user
CREATE TABLE public.user_google_calendar_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expiry_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
  calendar_email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own calendar tokens"
ON public.user_google_calendar_tokens FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own calendar tokens"
ON public.user_google_calendar_tokens FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own calendar tokens"
ON public.user_google_calendar_tokens FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own calendar tokens"
ON public.user_google_calendar_tokens FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_user_google_calendar_tokens_updated_at
BEFORE UPDATE ON public.user_google_calendar_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabel pentru cache evenimente Google Calendar
CREATE TABLE public.user_google_calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  google_event_id TEXT NOT NULL,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  summary TEXT,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  attendees JSONB DEFAULT '[]'::jsonb,
  organizer JSONB,
  status TEXT,
  html_link TEXT,
  meet_link TEXT,
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, google_event_id)
);

CREATE INDEX idx_gcal_events_user_start ON public.user_google_calendar_events(user_id, start_time);
CREATE INDEX idx_gcal_events_reminder ON public.user_google_calendar_events(reminder_sent, start_time) WHERE reminder_sent = false;

ALTER TABLE public.user_google_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own calendar events"
ON public.user_google_calendar_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own calendar events"
ON public.user_google_calendar_events FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own calendar events"
ON public.user_google_calendar_events FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own calendar events"
ON public.user_google_calendar_events FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_user_google_calendar_events_updated_at
BEFORE UPDATE ON public.user_google_calendar_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
