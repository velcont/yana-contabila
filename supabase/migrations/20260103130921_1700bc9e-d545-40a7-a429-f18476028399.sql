-- Create inactivity_notifications table
CREATE TABLE public.inactivity_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  last_activity_at TIMESTAMPTZ NOT NULL,
  notification_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.inactivity_notifications ENABLE ROW LEVEL SECURITY;

-- Admin can manage all notifications (using has_role RPC)
CREATE POLICY "Admins can manage inactivity notifications"
ON public.inactivity_notifications
FOR ALL
USING (
  (SELECT has_role(auth.uid(), 'admin'))
);

-- Service role can manage (for cron job)
CREATE POLICY "Service role can manage inactivity notifications"
ON public.inactivity_notifications
FOR ALL
USING (auth.role() = 'service_role');

-- Create index for faster queries
CREATE INDEX idx_inactivity_notifications_user_id ON public.inactivity_notifications(user_id);
CREATE INDEX idx_inactivity_notifications_sent ON public.inactivity_notifications(notification_sent);