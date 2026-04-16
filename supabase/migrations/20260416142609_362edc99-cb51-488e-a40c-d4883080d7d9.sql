
-- ============================================
-- FIX 1: Mutable search_path functions
-- ============================================

CREATE OR REPLACE FUNCTION public.check_intention_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NOT NULL AND (
    SELECT COUNT(*) FROM yana_intentions 
    WHERE user_id = NEW.user_id AND status = 'active'
  ) >= 10 THEN
    UPDATE yana_intentions 
    SET status = 'expired', updated_at = now()
    WHERE id = (
      SELECT id FROM yana_intentions 
      WHERE user_id = NEW.user_id AND status = 'active' 
      ORDER BY priority ASC, created_at ASC 
      LIMIT 1
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_effectiveness_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.effectiveness_score := CASE 
    WHEN (NEW.positive_reactions + NEW.negative_reactions) = 0 THEN 0.5
    ELSE NEW.positive_reactions::NUMERIC / (NEW.positive_reactions + NEW.negative_reactions)::NUMERIC
  END;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_yana_intentions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- ============================================
-- FIX 2: Overly permissive RLS policies
-- ============================================

-- ai_batch_queue: ALL for public → scoped to authenticated user
DROP POLICY IF EXISTS "System can manage queue" ON public.ai_batch_queue;
CREATE POLICY "Authenticated users manage own queue" ON public.ai_batch_queue
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ai_company_preferences: ALL for public → scoped to authenticated
DROP POLICY IF EXISTS "Service can manage preferences" ON public.ai_company_preferences;
CREATE POLICY "Authenticated users manage preferences" ON public.ai_company_preferences
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = company_id 
      AND (c.user_id = auth.uid() OR c.managed_by_accountant_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies c 
      WHERE c.id = company_id 
      AND (c.user_id = auth.uid() OR c.managed_by_accountant_id = auth.uid())
    )
  );

-- ai_learned_patterns: ALL for public → service_role only  
DROP POLICY IF EXISTS "Service can manage patterns" ON public.ai_learned_patterns;
CREATE POLICY "Service role manages patterns" ON public.ai_learned_patterns
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Authenticated users read patterns" ON public.ai_learned_patterns
  FOR SELECT TO authenticated
  USING (true);

-- ai_reflection_logs: INSERT for public → authenticated with user check
DROP POLICY IF EXISTS "Service role can insert reflection logs" ON public.ai_reflection_logs;
CREATE POLICY "Authenticated users insert own reflection logs" ON public.ai_reflection_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- audit_logs: INSERT for public → authenticated + service_role
DROP POLICY IF EXISTS "Service can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role insert audit logs" ON public.audit_logs
  FOR INSERT TO service_role
  WITH CHECK (true);

-- knowledge_base: keep but ensure authenticated only
DROP POLICY IF EXISTS "Authenticated users can insert knowledge" ON public.knowledge_base;
DROP POLICY IF EXISTS "Authenticated users can update knowledge" ON public.knowledge_base;
CREATE POLICY "Authenticated users insert knowledge" ON public.knowledge_base
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Authenticated users update knowledge" ON public.knowledge_base
  FOR UPDATE TO authenticated
  USING (true);

-- client_verification_history: public → authenticated with user check
DROP POLICY IF EXISTS "Service can insert verifications" ON public.client_verification_history;
CREATE POLICY "Authenticated users insert verifications" ON public.client_verification_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = verified_by);

-- companies_audit_log: restrict to authenticated (uses accessed_by column)
DROP POLICY IF EXISTS "Service can insert audit logs" ON public.companies_audit_log;
CREATE POLICY "Authenticated users insert company audit" ON public.companies_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = accessed_by);

-- credits_purchases: public → service_role only (edge functions insert these)
DROP POLICY IF EXISTS "Service can insert purchases" ON public.credits_purchases;
CREATE POLICY "Service role insert purchases" ON public.credits_purchases
  FOR INSERT TO service_role
  WITH CHECK (true);

-- deleted_users: public → service_role only
DROP POLICY IF EXISTS "Service can insert deleted users" ON public.deleted_users;
CREATE POLICY "Service role insert deleted users" ON public.deleted_users
  FOR INSERT TO service_role
  WITH CHECK (true);

-- onboarding_steps_progress: public → authenticated (no user_id, just restrict role)
DROP POLICY IF EXISTS "Service can insert onboarding progress" ON public.onboarding_steps_progress;
CREATE POLICY "Authenticated users insert onboarding progress" ON public.onboarding_steps_progress
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- moltbook_activity_log: public → authenticated (no user_id)
DROP POLICY IF EXISTS "Admins can insert moltbook_activity_log" ON public.moltbook_activity_log;
CREATE POLICY "Authenticated users insert activity log" ON public.moltbook_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- smartbill_invoices: public → authenticated with user scope + service_role
DROP POLICY IF EXISTS "Service can insert invoices" ON public.smartbill_invoices;
DROP POLICY IF EXISTS "Service can update invoices" ON public.smartbill_invoices;
CREATE POLICY "Authenticated users insert invoices" ON public.smartbill_invoices
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users update own invoices" ON public.smartbill_invoices
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Service role manage invoices" ON public.smartbill_invoices
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
