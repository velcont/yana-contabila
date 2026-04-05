
CREATE TABLE public.daily_briefing_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  briefing_date DATE NOT NULL UNIQUE,
  news_fiscal JSONB DEFAULT '[]'::jsonb,
  news_business JSONB DEFAULT '[]'::jsonb,
  news_politic JSONB DEFAULT '[]'::jsonb,
  ai_summary_fiscal TEXT DEFAULT '',
  ai_summary_business TEXT DEFAULT '',
  ai_summary_politic TEXT DEFAULT '',
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_briefing_data ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_daily_briefing_date ON public.daily_briefing_data (briefing_date DESC);
