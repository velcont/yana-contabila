-- Add task memory columns to yana_action_items
ALTER TABLE public.yana_action_items 
  ADD COLUMN IF NOT EXISTS postponed_at timestamptz,
  ADD COLUMN IF NOT EXISTS postponed_reason text,
  ADD COLUMN IF NOT EXISTS original_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_notes text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'auto';

-- Add notification preference columns to yana_client_profiles
ALTER TABLE public.yana_client_profiles
  ADD COLUMN IF NOT EXISTS morning_briefing_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS evening_debrief_enabled boolean DEFAULT true;