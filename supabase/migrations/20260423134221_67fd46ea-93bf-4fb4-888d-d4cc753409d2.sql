
-- Lead scoring & enrichment fields
ALTER TABLE public.crm_contacts 
  ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_score_reasons JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enrichment_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

ALTER TABLE public.crm_companies
  ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enrichment_data JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_lead_score ON public.crm_contacts(user_id, lead_score DESC);
CREATE INDEX IF NOT EXISTS idx_crm_deals_currency ON public.crm_deals(currency);

-- Email templates
CREATE TABLE IF NOT EXISTS public.crm_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  variables TEXT[] DEFAULT '{}',
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_templates_user ON public.crm_email_templates(user_id);
ALTER TABLE public.crm_email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own templates" ON public.crm_email_templates FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_crm_templates_updated_at BEFORE UPDATE ON public.crm_email_templates FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

-- Currency rates cache (RON base)
CREATE TABLE IF NOT EXISTS public.crm_currency_rates (
  currency TEXT PRIMARY KEY,
  rate_to_ron NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_currency_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read rates" ON public.crm_currency_rates FOR SELECT USING (true);

INSERT INTO public.crm_currency_rates (currency, rate_to_ron) VALUES
  ('RON', 1.0),
  ('EUR', 4.97),
  ('USD', 4.55),
  ('GBP', 5.80)
ON CONFLICT (currency) DO NOTHING;

-- Duplicate detection groups
CREATE TABLE IF NOT EXISTS public.crm_duplicate_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL,
  match_key TEXT NOT NULL,
  contact_ids UUID[] NOT NULL,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_dups_user ON public.crm_duplicate_groups(user_id, resolved);
ALTER TABLE public.crm_duplicate_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dup groups" ON public.crm_duplicate_groups FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Helper: detect duplicate contacts by email + by name+phone
CREATE OR REPLACE FUNCTION public.detect_contact_duplicates(p_user_id UUID)
RETURNS TABLE(match_type TEXT, match_key TEXT, contact_ids UUID[], count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 'email'::TEXT, LOWER(c.email), array_agg(c.id ORDER BY c.created_at), COUNT(*)::INTEGER
  FROM crm_contacts c
  WHERE c.user_id = p_user_id AND c.email IS NOT NULL AND c.email <> ''
  GROUP BY LOWER(c.email)
  HAVING COUNT(*) > 1
  UNION ALL
  SELECT 'name_phone'::TEXT, LOWER(c.first_name || COALESCE(c.last_name, '')) || COALESCE(c.phone, ''), array_agg(c.id ORDER BY c.created_at), COUNT(*)::INTEGER
  FROM crm_contacts c
  WHERE c.user_id = p_user_id AND c.phone IS NOT NULL AND c.phone <> ''
  GROUP BY LOWER(c.first_name || COALESCE(c.last_name, '')), c.phone
  HAVING COUNT(*) > 1;
END;
$$;

-- Forecast: weighted pipeline value
CREATE OR REPLACE FUNCTION public.crm_forecast_revenue(p_user_id UUID)
RETURNS TABLE(stage_name TEXT, deal_count INTEGER, total_value NUMERIC, weighted_value NUMERIC, currency TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.name, COUNT(d.id)::INTEGER, COALESCE(SUM(d.value), 0), COALESCE(SUM(d.value * COALESCE(d.probability, s.default_probability, 50) / 100.0), 0), COALESCE(MAX(d.currency), 'RON')
  FROM crm_pipeline_stages s
  LEFT JOIN crm_deals d ON d.stage_id = s.id AND d.status = 'open' AND d.user_id = p_user_id
  WHERE s.user_id = p_user_id AND NOT s.is_lost
  GROUP BY s.id, s.name, s.display_order
  ORDER BY s.display_order;
END;
$$;

-- Reports: conversion + cycle time
CREATE OR REPLACE FUNCTION public.crm_report_metrics(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_deals INTEGER;
  won_deals INTEGER;
  lost_deals INTEGER;
  open_deals INTEGER;
  avg_cycle_days NUMERIC;
  total_won_value NUMERIC;
  conversion_rate NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_deals FROM crm_deals WHERE user_id = p_user_id;
  SELECT COUNT(*), COALESCE(SUM(value),0) INTO won_deals, total_won_value FROM crm_deals WHERE user_id = p_user_id AND status = 'won';
  SELECT COUNT(*) INTO lost_deals FROM crm_deals WHERE user_id = p_user_id AND status = 'lost';
  SELECT COUNT(*) INTO open_deals FROM crm_deals WHERE user_id = p_user_id AND status = 'open';
  SELECT AVG(EXTRACT(EPOCH FROM (actual_close_date::timestamptz - created_at))/86400) INTO avg_cycle_days
    FROM crm_deals WHERE user_id = p_user_id AND status = 'won' AND actual_close_date IS NOT NULL;
  conversion_rate := CASE WHEN (won_deals + lost_deals) > 0 THEN won_deals::NUMERIC / (won_deals + lost_deals) * 100 ELSE 0 END;
  RETURN jsonb_build_object(
    'total_deals', total_deals,
    'won_deals', won_deals,
    'lost_deals', lost_deals,
    'open_deals', open_deals,
    'conversion_rate', ROUND(conversion_rate, 2),
    'avg_cycle_days', ROUND(COALESCE(avg_cycle_days, 0), 1),
    'total_won_value', total_won_value
  );
END;
$$;
