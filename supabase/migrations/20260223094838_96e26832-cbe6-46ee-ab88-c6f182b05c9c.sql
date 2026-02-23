
-- Tabel pentru rapoarte Strategie AI / Transformare Digitală
CREATE TABLE public.ai_strategy_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  industry TEXT NOT NULL,
  employees_count INTEGER,
  annual_revenue NUMERIC,
  net_profit NUMERIC,
  departments TEXT[],
  business_description TEXT,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  assumptions JSONB DEFAULT '{"usd_ron_rate": 4.97, "hourly_cost": 50, "growth_percent": 10}'::jsonb,
  calculated_roi JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_strategy_reports ENABLE ROW LEVEL SECURITY;

-- Users can only see their own reports
CREATE POLICY "Users can view own strategy reports"
ON public.ai_strategy_reports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own strategy reports"
ON public.ai_strategy_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strategy reports"
ON public.ai_strategy_reports FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategy reports"
ON public.ai_strategy_reports FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_ai_strategy_reports_updated_at
BEFORE UPDATE ON public.ai_strategy_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index on user_id for fast lookups
CREATE INDEX idx_ai_strategy_reports_user_id ON public.ai_strategy_reports(user_id);
