ALTER TABLE public.yana_self_mod_settings
  ADD COLUMN IF NOT EXISTS enable_code_patches BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS code_patch_require_approval BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS code_patch_max_per_run INTEGER NOT NULL DEFAULT 1;