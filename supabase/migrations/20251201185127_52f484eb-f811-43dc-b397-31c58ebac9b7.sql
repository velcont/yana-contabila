-- Fix functions missing SET search_path parameter
-- This addresses the Supabase linter warning about mutable search_path

-- Function: update_strategic_facts_updated_at
DROP FUNCTION IF EXISTS public.update_strategic_facts_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION public.update_strategic_facts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Function: update_doctorate_updated_at
DROP FUNCTION IF EXISTS public.update_doctorate_updated_at() CASCADE;
CREATE OR REPLACE FUNCTION public.update_doctorate_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Function: cleanup_expired_cache
DROP FUNCTION IF EXISTS public.cleanup_expired_cache() CASCADE;
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_response_cache
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;