-- Backfill pentru user_journey.total_interactions din mesaje reale
-- Actualizăm toți utilizatorii cu numărul corect de mesaje

UPDATE user_journey uj
SET 
  total_interactions = COALESCE(
    (SELECT COUNT(*) 
     FROM yana_messages m 
     JOIN yana_conversations c ON m.conversation_id = c.id 
     WHERE c.user_id = uj.user_id AND m.role = 'user'),
    1
  ),
  last_interaction_at = COALESCE(
    (SELECT MAX(m.created_at) 
     FROM yana_messages m 
     JOIN yana_conversations c ON m.conversation_id = c.id 
     WHERE c.user_id = uj.user_id),
    uj.last_interaction_at
  )
WHERE TRUE;

-- Backfill pentru yana_relationships.total_messages
UPDATE yana_relationships yr
SET 
  total_messages = COALESCE(
    (SELECT COUNT(*) 
     FROM yana_messages m 
     JOIN yana_conversations c ON m.conversation_id = c.id 
     WHERE c.user_id = yr.user_id AND m.role = 'user'),
    0
  ),
  total_conversations = COALESCE(
    (SELECT COUNT(DISTINCT c.id) 
     FROM yana_conversations c 
     WHERE c.user_id = yr.user_id),
    1
  )
WHERE TRUE;