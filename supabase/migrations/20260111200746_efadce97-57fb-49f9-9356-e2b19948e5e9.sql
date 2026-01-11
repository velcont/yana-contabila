-- Mitigare NULL-uri în yana_relationships pentru threshold dinamic
UPDATE yana_relationships 
SET 
  hook_score = COALESCE(hook_score, 0),
  total_conversations = COALESCE(total_conversations, 0)
WHERE hook_score IS NULL OR total_conversations IS NULL;