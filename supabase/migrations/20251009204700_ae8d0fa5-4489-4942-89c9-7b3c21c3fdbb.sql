-- Add rate limiting and audit logging for email_contacts table

-- Create function to log contact access for security monitoring
CREATE OR REPLACE FUNCTION public.log_contact_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log every SELECT on email_contacts for audit trail
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
$$;

-- Add rate limiting check to email_contacts policies
-- Drop existing SELECT policy and recreate with rate limiting
DROP POLICY IF EXISTS "Users can view their own email contacts" ON public.email_contacts;

CREATE POLICY "Users can view their own email contacts with rate limiting"
ON public.email_contacts
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id AND
  public.check_rate_limit(auth.uid(), 'email_contacts_query', 50) -- Max 50 queries per minute
);

-- Add index for audit performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_email_contacts 
ON public.audit_logs(user_id, table_name, created_at)
WHERE table_name = 'email_contacts';

-- Add comments
COMMENT ON POLICY "Users can view their own email contacts with rate limiting" ON public.email_contacts IS 
'Restricts SELECT to authenticated users viewing only their own contacts with rate limiting (50 queries/minute) to prevent data harvesting attacks.';

COMMENT ON FUNCTION public.log_contact_access() IS 
'Logs all email_contacts access for security audit trail. Helps detect suspicious patterns like mass data extraction attempts.';