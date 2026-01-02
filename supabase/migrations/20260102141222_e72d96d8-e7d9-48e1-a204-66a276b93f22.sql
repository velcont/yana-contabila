-- Tabel pentru tracking sesiuni active
CREATE TABLE public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  current_page TEXT NOT NULL DEFAULT '/',
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS: doar adminii pot vedea toate sesiunile
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all sessions"
ON active_sessions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own session"
ON active_sessions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own session"
ON active_sessions FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own session"
ON active_sessions FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Indexes pentru performanță
CREATE INDEX idx_active_sessions_last_activity ON active_sessions(last_activity);
CREATE INDEX idx_active_sessions_user_id ON active_sessions(user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.active_sessions;

-- Funcție cleanup sesiuni inactive (>5 minute)
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.active_sessions 
  WHERE last_activity < now() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;