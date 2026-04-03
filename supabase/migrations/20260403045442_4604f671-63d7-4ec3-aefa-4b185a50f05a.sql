CREATE TABLE public.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  metric TEXT NOT NULL,
  operator TEXT NOT NULL DEFAULT 'gt',
  threshold NUMERIC NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  enabled BOOLEAN DEFAULT true,
  cooldown_minutes INTEGER DEFAULT 60,
  last_triggered_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage alert rules" ON public.alert_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
