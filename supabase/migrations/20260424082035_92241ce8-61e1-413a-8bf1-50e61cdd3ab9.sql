-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule if exists (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'yana-goal-tracker-daily') THEN
    PERFORM cron.unschedule('yana-goal-tracker-daily');
  END IF;
END $$;

-- Schedule daily at 06:00 UTC
SELECT cron.schedule(
  'yana-goal-tracker-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ygfsuoloxzjpiulogrjz.supabase.co/functions/v1/yana-goal-tracker',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZnN1b2xveHpqcGl1bG9ncmp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNTUxNTUsImV4cCI6MjA3NDgzMTE1NX0.69qcg2ituWRE5GwUfrpc-D_fWlCfGCv0zw8gNxTmkqE"}'::jsonb,
    body := jsonb_build_object('triggered_at', now(), 'source', 'cron')
  ) AS request_id;
  $$
);