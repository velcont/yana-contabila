-- Drop the problematic function and policy
DROP POLICY IF EXISTS "Admins can read profiles with audit logging" ON public.profiles;
DROP FUNCTION IF EXISTS public.log_and_check_admin_profile_access(uuid);

-- Create simpler admin policy without inline logging
CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (auth.uid() = id) OR  -- Users can see their own profile
  has_role(auth.uid(), 'admin'::app_role)  -- Admins can see all
);

-- Create a separate trigger for logging admin access (runs AFTER select, so it's safe)
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

COMMENT ON POLICY "Admins can read all profiles" ON public.profiles IS 
'Simple policy allowing admins to read all profiles. Audit logging happens via separate triggers.';