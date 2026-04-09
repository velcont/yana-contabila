-- Tabel pentru portofoliu persistent
CREATE TABLE public.user_portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ticker TEXT NOT NULL,
  company_name TEXT,
  platform TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  avg_buy_price NUMERIC NOT NULL DEFAULT 0,
  current_price NUMERIC,
  currency TEXT NOT NULL DEFAULT 'USD',
  asset_type TEXT NOT NULL DEFAULT 'stock',
  sector TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  closed_at TIMESTAMP WITH TIME ZONE,
  sell_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portfolios" ON public.user_portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own portfolios" ON public.user_portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolios" ON public.user_portfolios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolios" ON public.user_portfolios FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_user_portfolios_updated_at
  BEFORE UPDATE ON public.user_portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabel pentru calculele fiscale
CREATE TABLE public.investment_tax_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tax_year INTEGER NOT NULL,
  total_gains_ron NUMERIC NOT NULL DEFAULT 0,
  total_losses_ron NUMERIC NOT NULL DEFAULT 0,
  net_taxable_ron NUMERIC NOT NULL DEFAULT 0,
  tax_10_percent NUMERIC NOT NULL DEFAULT 0,
  cass_applicable BOOLEAN NOT NULL DEFAULT false,
  cass_amount NUMERIC NOT NULL DEFAULT 0,
  exchange_rate_used NUMERIC,
  positions_data JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.investment_tax_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tax calcs" ON public.investment_tax_calculations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own tax calcs" ON public.investment_tax_calculations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tax calcs" ON public.investment_tax_calculations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tax calcs" ON public.investment_tax_calculations FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_investment_tax_calculations_updated_at
  BEFORE UPDATE ON public.investment_tax_calculations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();