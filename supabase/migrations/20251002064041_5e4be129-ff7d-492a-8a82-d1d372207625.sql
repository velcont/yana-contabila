-- Create table for fiscal news
CREATE TABLE public.fiscal_news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL,
  link TEXT NOT NULL UNIQUE,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_fiscal_news_published_at ON public.fiscal_news(published_at DESC);
CREATE INDEX idx_fiscal_news_category ON public.fiscal_news(category);

-- Enable RLS
ALTER TABLE public.fiscal_news ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read fiscal news (public information)
CREATE POLICY "Anyone can view fiscal news"
  ON public.fiscal_news
  FOR SELECT
  USING (true);

-- Policy: Only authenticated users can insert (via edge function with service role)
-- This will be handled by the edge function with service role key