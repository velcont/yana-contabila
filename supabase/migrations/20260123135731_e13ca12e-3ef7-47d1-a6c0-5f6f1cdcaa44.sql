-- Funcție pentru sincronizare automată yana_soul_core din yana_relationships
CREATE OR REPLACE FUNCTION sync_soul_core_counters()
RETURNS TRIGGER AS $$
DECLARE
  core_exists BOOLEAN;
BEGIN
  -- Verifică dacă există row-ul (protecție)
  SELECT EXISTS(
    SELECT 1 FROM yana_soul_core 
    WHERE id = '00000000-0000-0000-0000-000000000001'
  ) INTO core_exists;
  
  -- Doar dacă există, actualizează
  IF core_exists THEN
    UPDATE yana_soul_core
    SET 
      total_conversations = COALESCE((
        SELECT SUM(total_conversations) FROM yana_relationships
      ), 0),
      total_users_helped = COALESCE((
        SELECT COUNT(DISTINCT user_id) 
        FROM yana_relationships 
        WHERE total_conversations > 0
      ), 0),
      updated_at = NOW()
    WHERE id = '00000000-0000-0000-0000-000000000001';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop dacă există (idempotent)
DROP TRIGGER IF EXISTS trigger_sync_soul_core ON yana_relationships;

-- Crează trigger
CREATE TRIGGER trigger_sync_soul_core
AFTER INSERT OR UPDATE ON yana_relationships
FOR EACH ROW EXECUTE FUNCTION sync_soul_core_counters();