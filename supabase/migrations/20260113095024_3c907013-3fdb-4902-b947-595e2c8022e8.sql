-- Add self_correction_apology to allowed initiative types
ALTER TABLE yana_initiatives DROP CONSTRAINT IF EXISTS yana_initiatives_initiative_type_check;
ALTER TABLE yana_initiatives ADD CONSTRAINT yana_initiatives_initiative_type_check 
CHECK (initiative_type IN ('proactive_insight', 'relationship_checkin', 'goal_proposal', 'learning_share', 'celebration', 'self_correction_apology'));