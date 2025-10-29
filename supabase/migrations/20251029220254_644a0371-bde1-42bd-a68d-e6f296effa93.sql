-- Activează extensiile necesare pentru cron job
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Șterge job-ul existent dacă există (pentru a evita duplicate)
SELECT cron.unschedule('process-scheduled-emails-job') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-emails-job'
);

-- Creează cron job care rulează la fiecare 5 minute
-- Job-ul va apela edge function-ul process-scheduled-emails
SELECT cron.schedule(
  'process-scheduled-emails-job',
  '*/5 * * * *', -- La fiecare 5 minute
  $$
  SELECT
    net.http_post(
      url := 'https://ygfsuoloxzjpiulogrjz.supabase.co/functions/v1/process-scheduled-emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Adaugă un comentariu pentru documentare
COMMENT ON EXTENSION pg_cron IS 'Job scheduler pentru procesarea automată a emailurilor programate';
