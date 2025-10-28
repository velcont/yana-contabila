
-- Fix 1: Add unique constraints to prevent duplicate payments at DB level
ALTER TABLE credits_purchases 
ADD CONSTRAINT unique_stripe_checkout_session_id 
UNIQUE (stripe_checkout_session_id);

ALTER TABLE subscription_payments 
ADD CONSTRAINT unique_stripe_invoice_id 
UNIQUE (stripe_invoice_id);

-- Fix 2: Create admin alerts table for critical payment issues
CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can see alerts
CREATE POLICY "Admins can view alerts"
  ON admin_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Only admins can resolve alerts
CREATE POLICY "Admins can update alerts"
  ON admin_alerts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- System can insert alerts
CREATE POLICY "System can insert alerts"
  ON admin_alerts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_admin_alerts_resolved ON admin_alerts(resolved, created_at DESC);
CREATE INDEX idx_admin_alerts_severity ON admin_alerts(severity, created_at DESC);

-- Fix 3: Create user notifications table for in-app notifications when email fails
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON user_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can mark their notifications as read
CREATE POLICY "Users can update own notifications"
  ON user_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- System can create notifications
CREATE POLICY "System can insert notifications"
  ON user_notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id, created_at DESC);
CREATE INDEX idx_user_notifications_unread ON user_notifications(user_id, read) WHERE read = false;

-- Add trigger for updated_at
CREATE TRIGGER update_user_notifications_updated_at
  BEFORE UPDATE ON user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
