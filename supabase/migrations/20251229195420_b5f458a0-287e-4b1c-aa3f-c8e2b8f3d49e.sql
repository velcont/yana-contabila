ALTER TABLE public.smartbill_invoices
ADD COLUMN IF NOT EXISTS stripe_invoice_id text;

CREATE INDEX IF NOT EXISTS idx_smartbill_invoices_stripe_invoice_id
ON public.smartbill_invoices (stripe_invoice_id);
