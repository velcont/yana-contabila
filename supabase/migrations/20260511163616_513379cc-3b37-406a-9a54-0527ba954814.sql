-- 1) doctorate_chapter_files
DROP POLICY IF EXISTS "Only owner can access doctorate chapter files" ON public.doctorate_chapter_files;
CREATE POLICY "Users can view own doctorate files"
  ON public.doctorate_chapter_files FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own doctorate files"
  ON public.doctorate_chapter_files FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own doctorate files"
  ON public.doctorate_chapter_files FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own doctorate files"
  ON public.doctorate_chapter_files FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 2) knowledge_base
DROP POLICY IF EXISTS "Authenticated users insert knowledge" ON public.knowledge_base;
DROP POLICY IF EXISTS "Authenticated users update knowledge" ON public.knowledge_base;
CREATE POLICY "Admins can insert knowledge"
  ON public.knowledge_base FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update knowledge"
  ON public.knowledge_base FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3) chat_cache
DROP POLICY IF EXISTS "Service role can insert cache" ON public.chat_cache;
DROP POLICY IF EXISTS "Service role can update cache" ON public.chat_cache;

-- 4) chat_patterns
DROP POLICY IF EXISTS "Service role can insert chat patterns" ON public.chat_patterns;
DROP POLICY IF EXISTS "Service role can update chat patterns" ON public.chat_patterns;

-- 5) ai_usage
DROP POLICY IF EXISTS "Service can insert AI usage" ON public.ai_usage;
CREATE POLICY "Users insert own AI usage"
  ON public.ai_usage FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6) analytics_events
DROP POLICY IF EXISTS "Authenticated users can insert analytics events" ON public.analytics_events;
CREATE POLICY "Users insert own analytics events"
  ON public.analytics_events FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- 7) moltbook_activity_log (no user_id column — restrict writes to service role)
DROP POLICY IF EXISTS "Authenticated users insert activity log" ON public.moltbook_activity_log;

-- 8) onboarding_steps_progress
DROP POLICY IF EXISTS "Authenticated users insert onboarding progress" ON public.onboarding_steps_progress;
CREATE POLICY "Users insert own onboarding progress"
  ON public.onboarding_steps_progress FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.companies c
            WHERE c.id = onboarding_steps_progress.client_company_id
              AND (c.user_id = auth.uid() OR c.managed_by_accountant_id = auth.uid()))
  );

-- 9) strategic_advisor_facts
DROP POLICY IF EXISTS "Service can insert facts" ON public.strategic_advisor_facts;
DROP POLICY IF EXISTS "Service can update facts" ON public.strategic_advisor_facts;

-- 10) strategic_advisor_validations
DROP POLICY IF EXISTS "Service can insert validations" ON public.strategic_advisor_validations;
DROP POLICY IF EXISTS "Service can update validations" ON public.strategic_advisor_validations;

-- 11) subscription_payments
DROP POLICY IF EXISTS "Service can insert subscription payments" ON public.subscription_payments;

-- 12) system_health
DROP POLICY IF EXISTS "Service can insert health checks" ON public.system_health;

-- 13) terms_acceptance
DROP POLICY IF EXISTS "Service can insert terms acceptance" ON public.terms_acceptance;
CREATE POLICY "Users insert own terms acceptance"
  ON public.terms_acceptance FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 14) user_notifications
DROP POLICY IF EXISTS "Service can insert notifications" ON public.user_notifications;