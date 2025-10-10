-- Update voice usage function to limit to 10 minutes for regular users, unlimited for admins
CREATE OR REPLACE FUNCTION public.get_voice_usage_for_month()
RETURNS TABLE(minutes_used numeric, minutes_remaining numeric, month_year text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_month TEXT;
  usage_record RECORD;
  monthly_limit NUMERIC;
  is_user_admin BOOLEAN;
BEGIN
  -- Get current month in YYYY-MM format
  current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Check if user is admin
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_user_admin;
  
  -- Set limit based on role: unlimited for admins, 10 minutes for regular users
  IF is_user_admin THEN
    monthly_limit := 999999; -- Effectively unlimited
  ELSE
    monthly_limit := 10; -- 10 minutes per month for regular users
  END IF;
  
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
$function$;