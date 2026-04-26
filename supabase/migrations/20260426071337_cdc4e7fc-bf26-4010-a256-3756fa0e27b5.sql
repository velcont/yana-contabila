SELECT cron.unschedule('prospect-onrc-daily');

SELECT cron.schedule(
  'prospect-onrc-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ygfsuoloxzjpiulogrjz.supabase.co/functions/v1/prospect-onrc-scraper',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZnN1b2xveHpqcGl1bG9ncmp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNTUxNTUsImV4cCI6MjA3NDgzMTE1NX0.69qcg2ituWRE5GwUfrpc-D_fWlCfGCv0zw8gNxTmkqE"}'::jsonb,
    body := '{"user_id": "01632447-e347-4485-94f1-dc9792599d8e", "target_count": 15}'::jsonb
  );
  $$
);