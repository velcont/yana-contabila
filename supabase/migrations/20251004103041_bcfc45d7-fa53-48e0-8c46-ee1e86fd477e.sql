-- Create table for tracking voice usage per user
CREATE TABLE IF NOT EXISTS public.voice_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  minutes_used NUMERIC NOT NULL DEFAULT 0,
  month_year TEXT NOT NULL, -- Format: 'YYYY-MM'
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month_year)
);

-- Enable RLS
ALTER TABLE public.voice_usage ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own usage
CREATE POLICY "Users can view their own voice usage"
  ON public.voice_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own usage
CREATE POLICY "Users can insert their own voice usage"
  ON public.voice_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own usage
CREATE POLICY "Users can update their own voice usage"
  ON public.voice_usage
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_voice_usage_updated_at
  BEFORE UPDATE ON public.voice_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get or create voice usage for current month
CREATE OR REPLACE FUNCTION public.get_voice_usage_for_month()
RETURNS TABLE (
  minutes_used NUMERIC,
  minutes_remaining NUMERIC,
  month_year TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month TEXT;
  usage_record RECORD;
  monthly_limit NUMERIC := 20; -- 20 minutes per month
BEGIN
  -- Get current month in YYYY-MM format
  current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Try to get existing record
  SELECT vu.minutes_used, vu.month_year
  INTO usage_record
  FROM public.voice_usage vu
  WHERE vu.user_id = auth.uid()
    AND vu.month_year = current_month;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.voice_usage (user_id, month_year, minutes_used)
    VALUES (auth.uid(), current_month, 0)
    RETURNING voice_usage.minutes_used, voice_usage.month_year
    INTO usage_record;
  END IF;
  
  -- Return usage info
  RETURN QUERY
  SELECT 
    usage_record.minutes_used,
    GREATEST(0, monthly_limit - usage_record.minutes_used) as minutes_remaining,
    usage_record.month_year;
END;
$$;

-- Function to increment voice usage
CREATE OR REPLACE FUNCTION public.increment_voice_usage(minutes_to_add NUMERIC)
RETURNS TABLE (
  success BOOLEAN,
  new_minutes_used NUMERIC,
  minutes_remaining NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_month TEXT;
  current_usage NUMERIC;
  monthly_limit NUMERIC := 20;
BEGIN
  current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Get current usage
  SELECT vu.minutes_used INTO current_usage
  FROM public.voice_usage vu
  WHERE vu.user_id = auth.uid()
    AND vu.month_year = current_month;
  
  -- If no record, create one
  IF NOT FOUND THEN
    INSERT INTO public.voice_usage (user_id, month_year, minutes_used, last_used_at)
    VALUES (auth.uid(), current_month, minutes_to_add, NOW())
    RETURNING voice_usage.minutes_used INTO current_usage;
  ELSE
    -- Update existing record
    UPDATE public.voice_usage
    SET 
      minutes_used = minutes_used + minutes_to_add,
      last_used_at = NOW(),
      updated_at = NOW()
    WHERE user_id = auth.uid()
      AND month_year = current_month
    RETURNING voice_usage.minutes_used INTO current_usage;
  END IF;
  
  RETURN QUERY
  SELECT 
    TRUE as success,
    current_usage as new_minutes_used,
    GREATEST(0, monthly_limit - current_usage) as minutes_remaining;
END;
$$;