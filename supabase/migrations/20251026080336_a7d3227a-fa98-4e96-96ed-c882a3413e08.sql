-- Fix remaining functions without search_path
-- Update all remaining functions to include search_path for security

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_single_current_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.is_current_version = true AND NEW.status = 'published' THEN
    UPDATE app_updates 
    SET is_current_version = false 
    WHERE is_current_version = true 
    AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_crm_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_etapa1()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_contact_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action_type,
    table_name,
    record_id,
    metadata
  )
  VALUES (
    auth.uid(),
    'SELECT',
    'email_contacts',
    NEW.id,
    jsonb_build_object(
      'email', NEW.email,
      'accessed_at', now()
    )
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_chat_pattern_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.question_category IS NOT NULL THEN
    INSERT INTO public.chat_patterns (question_pattern, question_category, frequency, last_asked_at)
    VALUES (
      'Pattern: ' || NEW.question_category,
      NEW.question_category,
      1,
      now()
    )
    ON CONFLICT (question_pattern) 
    DO UPDATE SET
      frequency = public.chat_patterns.frequency + 1,
      last_asked_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.aggregate_feedback_to_knowledge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  avg_rating_val NUMERIC;
  total_count INT;
BEGIN
  SELECT 
    AVG(CASE WHEN rating = 1 THEN 1.0 ELSE 0.0 END),
    COUNT(*)
  INTO avg_rating_val, total_count
  FROM public.chat_feedback
  WHERE question_category = NEW.question_category;
  
  UPDATE public.knowledge_base
  SET 
    avg_rating = avg_rating_val,
    total_ratings = total_count,
    updated_at = now()
  WHERE category = NEW.question_category;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_voice_usage(minutes_to_add numeric)
RETURNS TABLE(success boolean, new_minutes_used numeric, minutes_remaining numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  current_month TEXT;
  current_usage NUMERIC;
  monthly_limit NUMERIC := 20;
BEGIN
  current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  SELECT vu.minutes_used INTO current_usage
  FROM public.voice_usage vu
  WHERE vu.user_id = auth.uid()
    AND vu.month_year = current_month;
  
  IF NOT FOUND THEN
    INSERT INTO public.voice_usage (user_id, month_year, minutes_used, last_used_at)
    VALUES (auth.uid(), current_month, minutes_to_add, NOW())
    RETURNING voice_usage.minutes_used INTO current_usage;
  ELSE
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
$function$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_user_id uuid, p_endpoint text, p_max_requests integer DEFAULT 30)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  current_window TIMESTAMPTZ;
  current_count INTEGER;
BEGIN
  current_window := date_trunc('minute', now());
  
  SELECT request_count INTO current_count
  FROM public.api_rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start = current_window;
  
  IF current_count IS NULL THEN
    INSERT INTO public.api_rate_limits (user_id, endpoint, request_count, window_start)
    VALUES (p_user_id, p_endpoint, 1, current_window);
    RETURN TRUE;
  END IF;
  
  IF current_count >= p_max_requests THEN
    RETURN FALSE;
  END IF;
  
  UPDATE public.api_rate_limits
  SET request_count = request_count + 1
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start = current_window;
  
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  DELETE FROM public.chat_cache WHERE expires_at < now();
  DELETE FROM public.api_rate_limits WHERE window_start < (now() - interval '1 hour');
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_voice_usage_for_month()
RETURNS TABLE(minutes_used numeric, minutes_remaining numeric, month_year text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  current_month TEXT;
  usage_record RECORD;
  monthly_limit NUMERIC;
  is_user_admin BOOLEAN;
BEGIN
  current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO is_user_admin;
  
  IF is_user_admin THEN
    monthly_limit := 999999;
  ELSE
    monthly_limit := 10;
  END IF;
  
  SELECT vu.minutes_used, vu.month_year
  INTO usage_record
  FROM public.voice_usage vu
  WHERE vu.user_id = auth.uid()
    AND vu.month_year = current_month;
  
  IF NOT FOUND THEN
    INSERT INTO public.voice_usage (user_id, month_year, minutes_used)
    VALUES (auth.uid(), current_month, 0)
    RETURNING voice_usage.minutes_used, voice_usage.month_year
    INTO usage_record;
  END IF;
  
  RETURN QUERY
  SELECT 
    usage_record.minutes_used,
    GREATEST(0, monthly_limit - usage_record.minutes_used) as minutes_remaining,
    usage_record.month_year;
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_sensitive_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF (TG_TABLE_NAME = 'profiles' AND auth.uid() != NEW.id) THEN
    INSERT INTO audit_logs (user_id, action_type, table_name, record_id, metadata)
    VALUES (
      auth.uid(),
      'SUSPICIOUS_PROFILE_ACCESS',
      'profiles',
      NEW.id,
      jsonb_build_object('attempted_user_id', NEW.id, 'timestamp', now())
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_trial_expiration_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO public.trial_notifications (user_id, notification_type, trial_ends_at)
  SELECT 
    id,
    CASE 
      WHEN trial_ends_at - INTERVAL '30 days' <= now() 
           AND trial_ends_at - INTERVAL '29 days' > now() THEN '30_days'
      WHEN trial_ends_at - INTERVAL '15 days' <= now() 
           AND trial_ends_at - INTERVAL '14 days' > now() THEN '15_days'
      WHEN trial_ends_at <= now() THEN 'expired'
    END as notification_type,
    trial_ends_at
  FROM public.profiles
  WHERE trial_ends_at IS NOT NULL
    AND subscription_status != 'active'
    AND (
      (trial_ends_at - INTERVAL '30 days' <= now() AND trial_ends_at - INTERVAL '29 days' > now())
      OR (trial_ends_at - INTERVAL '15 days' <= now() AND trial_ends_at - INTERVAL '14 days' > now())
      OR (trial_ends_at <= now())
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.detect_overdue_workflow_stages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  all_completed BOOLEAN;
BEGIN
  IF NEW.status = 'in_progress' AND NEW.started_at IS NOT NULL THEN
    IF NOW() > (NEW.started_at + (NEW.estimated_days || ' days')::INTERVAL) THEN
      UPDATE public.monthly_workflow_instances
      SET overall_status = 'overdue'
      WHERE id = NEW.workflow_instance_id
      AND overall_status != 'completed';
    END IF;
  END IF;

  IF NEW.status = 'completed' THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM public.monthly_workflow_stages
      WHERE workflow_instance_id = NEW.workflow_instance_id
      AND status != 'completed'
    ) INTO all_completed;

    IF all_completed THEN
      UPDATE public.monthly_workflow_instances
      SET overall_status = 'completed',
          completed_at = NOW()
      WHERE id = NEW.workflow_instance_id;
    ELSE
      UPDATE public.monthly_workflow_instances
      SET overall_status = 'in_progress'
      WHERE id = NEW.workflow_instance_id
      AND overall_status = 'not_started';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_ai_budget(p_user_id uuid)
RETURNS TABLE(can_proceed boolean, current_usage_cents integer, budget_cents integer, usage_percent numeric, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  current_month TEXT;
  v_usage_cents INTEGER;
  v_budget_cents INTEGER;
  v_usage_percent NUMERIC;
BEGIN
  current_month := TO_CHAR(NOW(), 'YYYY-MM');
  
  SELECT 
    COALESCE(SUM(estimated_cost_cents), 0)::INTEGER,
    COALESCE(MAX(limits.monthly_budget_cents), 1000)::INTEGER
  INTO v_usage_cents, v_budget_cents
  FROM public.ai_usage usage
  LEFT JOIN public.ai_budget_limits limits ON limits.user_id = usage.user_id
  WHERE usage.user_id = p_user_id
    AND usage.month_year = current_month;
  
  v_usage_percent := (v_usage_cents::NUMERIC / v_budget_cents::NUMERIC * 100);
  
  RETURN QUERY SELECT
    v_usage_cents < v_budget_cents as can_proceed,
    v_usage_cents as current_usage_cents,
    v_budget_cents as budget_cents,
    v_usage_percent as usage_percent,
    CASE 
      WHEN v_usage_cents >= v_budget_cents THEN 'Budget lunar depășit. Contactează administratorul.'
      WHEN v_usage_percent > 90 THEN 'Aproape de limita bugetului (' || ROUND(v_usage_percent, 1)::TEXT || '%)'
      ELSE 'OK'
    END as message;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_default_workflow_template_for_accountant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.subscription_type = 'accounting_firm' AND NEW.subscription_status = 'active' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.monthly_workflow_templates
      WHERE accountant_id = NEW.id
      AND is_default = true
    ) THEN
      INSERT INTO public.monthly_workflow_templates (
        accountant_id,
        template_name,
        is_default,
        stages
      ) VALUES (
        NEW.id,
        'Proces Standard Lunar 2025',
        true,
        '[
          {
            "stage_number": 1,
            "stage_name": "PRIMIRE DOCUMENTE",
            "default_responsible_role": "receptionist",
            "estimated_days": 1,
            "start_message": "Preia actele de la client",
            "end_message": "Firma {company_name} a predat actele pentru {month_year}"
          },
          {
            "stage_number": 2,
            "stage_name": "INTRODUCERE ACTE PRIMARE",
            "default_responsible_role": "junior_accountant",
            "estimated_days": 3,
            "start_message": "Am început să introduc actele pe {month_year}",
            "end_message": "Am terminat actele primare pe {month_year}"
          },
          {
            "stage_number": 3,
            "stage_name": "SALARIZARE (HR)",
            "default_responsible_role": "hr_accountant",
            "estimated_days": 2,
            "start_message": "Am început să lucrez la contabilitatea RU pentru {month_year}",
            "end_message": "Am terminat salarizarea pentru {month_year}"
          },
          {
            "stage_number": 4,
            "stage_name": "VERIFICARE BALANȚĂ",
            "default_responsible_role": "senior_accountant",
            "estimated_days": 2,
            "start_message": "Am început să verific balanța pentru {month_year}",
            "end_message": "Am verificat balanța și închis dosarul {month_year}"
          },
          {
            "stage_number": 5,
            "stage_name": "DECLARAȚII",
            "default_responsible_role": "declarations_accountant",
            "estimated_days": 2,
            "start_message": "Am început să redactez declarațiile pentru {month_year}",
            "end_message": "Am depus declarațiile pentru {month_year}"
          }
        ]'::jsonb
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_admin_access_rate()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  recent_access_count INTEGER;
  is_user_admin BOOLEAN;
BEGIN
  is_user_admin := has_role(auth.uid(), 'admin'::app_role);
  
  IF NOT is_user_admin THEN
    RETURN TRUE;
  END IF;
  
  SELECT COUNT(*) INTO recent_access_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND action_type LIKE 'ADMIN_ACCESS_%'
    AND created_at > now() - interval '1 minute';
  
  RETURN recent_access_count < 100;
END;
$function$;

CREATE OR REPLACE FUNCTION public.audit_admin_sensitive_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  is_user_admin BOOLEAN;
  user_email_val TEXT;
BEGIN
  is_user_admin := has_role(auth.uid(), 'admin'::app_role);
  
  SELECT email INTO user_email_val FROM auth.users WHERE id = auth.uid();
  
  IF is_user_admin THEN
    INSERT INTO public.audit_logs (
      user_id,
      user_email,
      action_type,
      table_name,
      record_id,
      metadata
    )
    VALUES (
      auth.uid(),
      user_email_val,
      'ADMIN_SENSITIVE_ACCESS',
      TG_TABLE_NAME,
      CASE 
        WHEN TG_TABLE_NAME = 'profiles' THEN OLD.id
        WHEN TG_TABLE_NAME = 'companies' THEN OLD.id
        ELSE NULL
      END,
      jsonb_build_object(
        'accessed_at', now(),
        'table', TG_TABLE_NAME,
        'access_type', 'SELECT',
        'note', 'Admin accessed sensitive data - monitored for security'
      )
    );
  END IF;
  
  RETURN OLD;
END;
$function$;