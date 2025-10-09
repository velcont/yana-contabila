-- Create comprehensive audit log table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action_type TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT', etc.
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert audit logs
CREATE POLICY "Service can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);

-- Generic audit function
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email_val TEXT;
BEGIN
  -- Get user email
  SELECT email INTO user_email_val FROM auth.users WHERE id = auth.uid();

  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (
      user_id, 
      user_email, 
      action_type, 
      table_name, 
      record_id, 
      new_data
    )
    VALUES (
      auth.uid(), 
      user_email_val, 
      'INSERT', 
      TG_TABLE_NAME, 
      NEW.id, 
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (
      user_id, 
      user_email, 
      action_type, 
      table_name, 
      record_id, 
      old_data, 
      new_data
    )
    VALUES (
      auth.uid(), 
      user_email_val, 
      'UPDATE', 
      TG_TABLE_NAME, 
      NEW.id, 
      to_jsonb(OLD), 
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (
      user_id, 
      user_email, 
      action_type, 
      table_name, 
      record_id, 
      old_data
    )
    VALUES (
      auth.uid(), 
      user_email_val, 
      'DELETE', 
      TG_TABLE_NAME, 
      OLD.id, 
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
END;
$$;

-- Create triggers for all important tables

-- Audit analyses
DROP TRIGGER IF EXISTS audit_analyses_trigger ON public.analyses;
CREATE TRIGGER audit_analyses_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Audit companies
DROP TRIGGER IF EXISTS audit_companies_trigger ON public.companies;
CREATE TRIGGER audit_companies_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Audit analysis_shares
DROP TRIGGER IF EXISTS audit_analysis_shares_trigger ON public.analysis_shares;
CREATE TRIGGER audit_analysis_shares_trigger
  AFTER INSERT OR DELETE ON public.analysis_shares
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Audit analysis_comments
DROP TRIGGER IF EXISTS audit_analysis_comments_trigger ON public.analysis_comments;
CREATE TRIGGER audit_analysis_comments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.analysis_comments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Audit conversation_history
DROP TRIGGER IF EXISTS audit_conversation_history_trigger ON public.conversation_history;
CREATE TRIGGER audit_conversation_history_trigger
  AFTER INSERT ON public.conversation_history
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Audit user_roles
DROP TRIGGER IF EXISTS audit_user_roles_trigger ON public.user_roles;
CREATE TRIGGER audit_user_roles_trigger
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Audit email_broadcasts
DROP TRIGGER IF EXISTS audit_email_broadcasts_trigger ON public.email_broadcasts;
CREATE TRIGGER audit_email_broadcasts_trigger
  AFTER INSERT OR UPDATE ON public.email_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Audit favorite_analyses
DROP TRIGGER IF EXISTS audit_favorite_analyses_trigger ON public.favorite_analyses;
CREATE TRIGGER audit_favorite_analyses_trigger
  AFTER INSERT OR DELETE ON public.favorite_analyses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Audit research_data
DROP TRIGGER IF EXISTS audit_research_data_trigger ON public.research_data;
CREATE TRIGGER audit_research_data_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.research_data
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Function to log custom audit events (login, export, etc.)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action_type TEXT,
  p_table_name TEXT,
  p_record_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email_val TEXT;
BEGIN
  SELECT email INTO user_email_val FROM auth.users WHERE id = auth.uid();
  
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
    p_action_type,
    p_table_name,
    p_record_id,
    p_metadata
  );
END;
$$;