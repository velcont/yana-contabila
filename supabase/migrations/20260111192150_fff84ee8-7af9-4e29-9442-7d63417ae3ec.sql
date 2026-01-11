-- Adăugare coloane în yana_dreams pentru output structurat
ALTER TABLE yana_dreams
ADD COLUMN IF NOT EXISTS emotional_shift NUMERIC(4,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS insight_about_users TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS insight_about_self TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS updated_goal TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS dream_insights JSONB DEFAULT '{}';

-- Actualizare vise vechi pentru a evita NULL
UPDATE yana_dreams 
SET 
  emotional_shift = COALESCE(emotional_shift, 0),
  insight_about_users = COALESCE(insight_about_users, ''),
  insight_about_self = COALESCE(insight_about_self, ''),
  updated_goal = COALESCE(updated_goal, ''),
  dream_insights = COALESCE(dream_insights, '{}')
WHERE emotional_shift IS NULL 
   OR insight_about_users IS NULL 
   OR insight_about_self IS NULL 
   OR updated_goal IS NULL 
   OR dream_insights IS NULL;