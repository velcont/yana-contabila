
-- AUDIT COMPLET: Activare Realtime pentru tabele critice existente (fix audit 1.1)

-- Verificăm și activăm doar tabelele care există
DO $$
BEGIN
  -- 1. ANALIZE
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analyses') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.analyses';
    EXECUTE 'ALTER TABLE public.analyses REPLICA IDENTITY FULL';
  END IF;

  -- 2. COMPANIES  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'companies') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.companies';
    EXECUTE 'ALTER TABLE public.companies REPLICA IDENTITY FULL';
  END IF;

  -- 3. PROFILES
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles';
    EXECUTE 'ALTER TABLE public.profiles REPLICA IDENTITY FULL';
  END IF;

  -- 4. CHAT_INSIGHTS
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_insights') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_insights';
    EXECUTE 'ALTER TABLE public.chat_insights REPLICA IDENTITY FULL';
  END IF;

  -- 5. ACCOUNTANT_TASKS
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'accountant_tasks') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.accountant_tasks';
    EXECUTE 'ALTER TABLE public.accountant_tasks REPLICA IDENTITY FULL';
  END IF;

  -- 6. MONTHLY_WORKFLOW_INSTANCES
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'monthly_workflow_instances') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_workflow_instances';
    EXECUTE 'ALTER TABLE public.monthly_workflow_instances REPLICA IDENTITY FULL';
  END IF;

  -- 7. MONTHLY_WORKFLOW_STAGES
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'monthly_workflow_stages') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_workflow_stages';
    EXECUTE 'ALTER TABLE public.monthly_workflow_stages REPLICA IDENTITY FULL';
  END IF;

  -- 8. ANALYSIS_COMMENTS
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analysis_comments') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_comments';
    EXECUTE 'ALTER TABLE public.analysis_comments REPLICA IDENTITY FULL';
  END IF;

  -- 9. EMAIL_CONTACTS
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'email_contacts') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.email_contacts';
    EXECUTE 'ALTER TABLE public.email_contacts REPLICA IDENTITY FULL';
  END IF;

  -- 10. AI_USAGE
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_usage') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_usage';
    EXECUTE 'ALTER TABLE public.ai_usage REPLICA IDENTITY FULL';
  END IF;
END $$;
