-- Add content column to research_data table if it doesn't exist
ALTER TABLE research_data 
ADD COLUMN IF NOT EXISTS content TEXT;

-- Add index for better performance when querying by user_id
CREATE INDEX IF NOT EXISTS idx_research_data_user_id ON research_data(user_id);

-- Add helpful comment
COMMENT ON COLUMN research_data.content IS 'Detailed textual content about the research resource - summaries, key ideas, quotes, notes';