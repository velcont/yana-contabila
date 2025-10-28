-- Create subscription_payments table for tracking recurring subscription payments
CREATE TABLE subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL,
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  amount_paid_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'RON',
  subscription_type TEXT NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'paid',
  invoice_generated BOOLEAN DEFAULT FALSE,
  smartbill_invoice_id UUID REFERENCES smartbill_invoices(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX idx_subscription_payments_user ON subscription_payments(user_id);
CREATE INDEX idx_subscription_payments_stripe_sub ON subscription_payments(stripe_subscription_id);
CREATE INDEX idx_subscription_payments_date ON subscription_payments(payment_date DESC);

-- Enable RLS
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all subscription payments
CREATE POLICY "Admins can view all subscription payments"
ON subscription_payments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow service role to insert subscription payments
CREATE POLICY "Service can insert subscription payments"
ON subscription_payments FOR INSERT
WITH CHECK (true);