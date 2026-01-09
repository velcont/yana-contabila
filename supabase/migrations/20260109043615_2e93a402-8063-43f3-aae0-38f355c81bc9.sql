-- Add tracking columns for engagement question effectiveness
ALTER TABLE yana_messages 
ADD COLUMN IF NOT EXISTS ends_with_question BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS question_responded BOOLEAN DEFAULT NULL;

-- Add index for analytics queries
CREATE INDEX IF NOT EXISTS idx_yana_messages_engagement 
ON yana_messages (ends_with_question, question_responded) 
WHERE ends_with_question = TRUE;

-- Comment for documentation
COMMENT ON COLUMN yana_messages.ends_with_question IS 'TRUE if YANA message ends with a question mark';
COMMENT ON COLUMN yana_messages.question_responded IS 'TRUE if user responded to YANA question, NULL until determined';