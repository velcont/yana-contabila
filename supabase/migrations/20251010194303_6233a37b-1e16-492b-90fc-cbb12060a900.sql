-- Add comprehensive audit logging for admin access to sensitive tables

-- Create enhanced audit function for sensitive data access
CREATE OR REPLACE FUNCTION public.audit_admin_sensitive_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_user_admin BOOLEAN;
  user_email_val TEXT;
BEGIN
  -- Check if the current user is an admin
  is_user_admin := has_role(auth.uid(), 'admin'::app_role);
  
  -- Get user email for logging
  SELECT email INTO user_email_val FROM auth.users WHERE id = auth.uid();
  
  -- Only log if user is admin (to track admin access patterns)
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
$$;

-- Note: We cannot add AFTER SELECT triggers in PostgreSQL as SELECT triggers are not supported
-- Instead, we'll log admin access through application-level logging
-- However, we can add a helper function for the application to call

-- Create a function that applications should call when admins access sensitive data
CREATE OR REPLACE FUNCTION public.log_admin_access(
  p_table_name TEXT,
  p_record_id UUID,
  p_action TEXT DEFAULT 'VIEW'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_user_admin BOOLEAN;
  user_email_val TEXT;
BEGIN
  -- Check if the current user is an admin
  is_user_admin := has_role(auth.uid(), 'admin'::app_role);
  
  IF NOT is_user_admin THEN
    RETURN;
  END IF;
  
  -- Get user email for logging
  SELECT email INTO user_email_val FROM auth.users WHERE id = auth.uid();
  
  -- Log the access
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
    'ADMIN_ACCESS_' || p_action,
    p_table_name,
    p_record_id,
    jsonb_build_object(
      'accessed_at', now(),
      'action', p_action,
      'note', 'Admin access logged for security monitoring'
    )
  );
END;
$$;

-- Add rate limiting for admin profile access to detect suspicious activity
CREATE OR REPLACE FUNCTION public.check_admin_access_rate()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_access_count INTEGER;
  is_user_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  is_user_admin := has_role(auth.uid(), 'admin'::app_role);
  
  IF NOT is_user_admin THEN
    RETURN TRUE; -- Non-admins don't need rate limiting
  END IF;
  
  -- Count admin accesses to sensitive tables in the last minute
  SELECT COUNT(*) INTO recent_access_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND action_type LIKE 'ADMIN_ACCESS_%'
    AND created_at > now() - interval '1 minute';
  
  -- Allow up to 100 accesses per minute (reasonable for CRM usage)
  -- This is high enough for legitimate use but will catch bulk scraping
  RETURN recent_access_count < 100;
END;
$$;

COMMENT ON FUNCTION public.log_admin_access IS 'Logs admin access to sensitive tables for security auditing. Call this from application code when admins view sensitive data.';
COMMENT ON FUNCTION public.check_admin_access_rate IS 'Rate limiting for admin access to detect potential data scraping. Returns false if rate limit exceeded.';