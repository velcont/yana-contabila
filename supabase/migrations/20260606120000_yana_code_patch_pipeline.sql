-- ============================================
-- YANA CODE-PATCH PIPELINE
-- ============================================
-- Extends the self-development pipeline so Yana can generate small TS code
-- patches (not just agent specs), route them through human approval, and
-- (optionally) open a real GitHub PR via yana-self-modifier.
--
-- SAFETY POSTURE — every new capability ships DISABLED. Full autonomy requires
-- consciously flipping ALL of the following from the Admin panel:
--   * enable_code_patches          DEFAULT false  -> self-coder won't generate patches
--   * code_patch_require_approval  DEFAULT true   -> patches wait for a human click
--   * kill_switch (pre-existing)   DEFAULT true   -> modifier blocks every merge
-- ============================================

ALTER TABLE public.yana_self_mod_settings
  ADD COLUMN IF NOT EXISTS enable_code_patches BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS code_patch_require_approval BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS code_patch_max_per_run INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.yana_self_mod_settings.enable_code_patches IS
  'Master gate: when false, yana-self-coder never generates code_patch proposals and the promoter is a no-op.';
COMMENT ON COLUMN public.yana_self_mod_settings.code_patch_require_approval IS
  'When true, code patches require an explicit human Approve in the Admin panel before the promoter opens a PR.';

-- Helpful index for the promoter / Admin panel (filter by type + status).
CREATE INDEX IF NOT EXISTS idx_proposals_type_status
  ON public.yana_self_proposals(proposal_type, status, created_at DESC);

-- ============================================
-- CRON: yana-code-patch-promoter (every 30 min)
-- No-op while enable_code_patches=false OR kill_switch=true OR no approved patches.
-- ============================================
SELECT cron.unschedule('yana-code-patch-promoter-30min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'yana-code-patch-promoter-30min');

SELECT cron.schedule(
  'yana-code-patch-promoter-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ygfsuoloxzjpiulogrjz.supabase.co/functions/v1/yana-code-patch-promoter',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnZnN1b2xveHpqcGl1bG9ncmp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNTUxNTUsImV4cCI6MjA3NDgzMTE1NX0.69qcg2ituWRE5GwUfrpc-D_fWlCfGCv0zw8gNxTmkqE"}'::jsonb,
    body := jsonb_build_object('triggered_at', now(), 'source', 'cron')
  );
  $$
);
