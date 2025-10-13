-- Add cash_accounting_vat field to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS cash_accounting_vat boolean DEFAULT false;

-- Add comments for clarity
COMMENT ON COLUMN public.companies.vat_regime IS 'VAT payment regime: none (neplătitor), quarterly (trimestrial), monthly (lunar)';
COMMENT ON COLUMN public.companies.cash_accounting_vat IS 'TVA la încasare: true (Da), false (Nu)';
COMMENT ON COLUMN public.companies.tax_type IS 'Tip impozit: micro (impozit pe venit micro), profit (impozit pe profit)';