ALTER TABLE public.yana_autonomy_settings
  ADD COLUMN IF NOT EXISTS kill_switch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notify_post_execute boolean NOT NULL DEFAULT true;