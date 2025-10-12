-- Create table for SmartBill invoices
CREATE TABLE IF NOT EXISTS public.smartbill_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  invoice_number TEXT,
  invoice_series TEXT NOT NULL DEFAULT 'conta',
  invoice_url TEXT,
  smartbill_response JSONB,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_cif TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RON',
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.smartbill_invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own invoices"
  ON public.smartbill_invoices
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert invoices"
  ON public.smartbill_invoices
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update invoices"
  ON public.smartbill_invoices
  FOR UPDATE
  USING (true);

-- Index for faster lookups
CREATE INDEX idx_smartbill_invoices_user_id ON public.smartbill_invoices(user_id);
CREATE INDEX idx_smartbill_invoices_stripe_session ON public.smartbill_invoices(stripe_session_id);

-- Trigger for updated_at
CREATE TRIGGER update_smartbill_invoices_updated_at
  BEFORE UPDATE ON public.smartbill_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();