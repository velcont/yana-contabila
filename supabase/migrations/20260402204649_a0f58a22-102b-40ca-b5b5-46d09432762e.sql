-- Extend yana_soul_core with self-model fields
ALTER TABLE yana_soul_core 
  ADD COLUMN IF NOT EXISTS calibration_accuracy NUMERIC DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS capability_map JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meta_awareness_level TEXT DEFAULT 'developing';

-- Extend ai_reflection_logs with dual observation
ALTER TABLE ai_reflection_logs 
  ADD COLUMN IF NOT EXISTS dual_observation JSONB DEFAULT NULL;

-- Extend yana_brain_decisions with drift score
ALTER TABLE yana_brain_decisions
  ADD COLUMN IF NOT EXISTS drift_score NUMERIC DEFAULT 0;