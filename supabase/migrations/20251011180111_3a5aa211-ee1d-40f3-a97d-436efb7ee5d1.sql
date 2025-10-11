-- Create function to log admin profile access and check permissions
CREATE OR REPLACE FUNCTION public.log_and_check_admin_profile_access(profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_user_admin BOOLEAN;
  access_count INTEGER;
  user_email_val TEXT;
BEGIN
  -- Check if user is admin
  is_user_admin := has_role(auth.uid(), 'admin'::app_role);
  
  IF NOT is_user_admin THEN
    RETURN false;
  END IF;
  
  -- Check rate limit (max 100 accesses per minute)
  IF NOT check_admin_access_rate() THEN
    RETURN false;
  END IF;
  
  -- Get user email
  SELECT email INTO user_email_val FROM auth.users WHERE id = auth.uid();
  
  -- Log the admin access
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
    'ADMIN_PROFILE_ACCESS',
    'profiles',
    profile_id,
    jsonb_build_object(
      'accessed_at', now(),
      'note', 'Admin accessed user profile for potential email harvesting monitoring'
    )
  );
  
  -- Count accesses in last 5 minutes
  SELECT COUNT(*) INTO access_count
  FROM public.audit_logs
  WHERE user_id = auth.uid()
    AND action_type = 'ADMIN_PROFILE_ACCESS'
    AND table_name = 'profiles'
    AND created_at > now() - interval '5 minutes';
  
  -- Alert if suspicious bulk access (>50 profiles in 5 minutes)
  IF access_count > 50 AND access_count % 10 = 0 THEN
    INSERT INTO public.audit_logs (
      user_id,
      user_email,
      action_type,
      table_name,
      metadata
    )
    VALUES (
      auth.uid(),
      user_email_val,
      'SECURITY_ALERT_BULK_PROFILE_ACCESS',
      'profiles',
      jsonb_build_object(
        'access_count', access_count,
        'time_window', '5 minutes',
        'alert_level', 'HIGH',
        'message', 'Potential email harvesting attempt detected',
        'recommendation', 'Review admin account security and enable MFA if not already enabled'
      )
    );
  END IF;
  
  RETURN true;
END;
$$;

-- Drop existing admin policies and recreate with enhanced security
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles with rate limiting" ON public.profiles;

-- New policy with logging and rate limiting
CREATE POLICY "Admins can read profiles with audit logging"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (auth.uid() = id) OR  -- Users can always see their own profile
  log_and_check_admin_profile_access(id)  -- Admins with logging and rate limiting
);

-- Add comment to document the security measure
COMMENT ON POLICY "Admins can read profiles with audit logging" ON public.profiles IS 
'Protects against email harvesting by logging all admin accesses and implementing rate limiting. Alerts are generated for suspicious bulk access patterns (>50 profiles in 5 minutes).';