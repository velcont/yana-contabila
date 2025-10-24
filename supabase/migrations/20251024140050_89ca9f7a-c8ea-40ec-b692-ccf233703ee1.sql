-- Adăugare coloană pentru tracking versiune curentă live
ALTER TABLE app_updates 
ADD COLUMN is_current_version BOOLEAN DEFAULT false;

-- Creare index pentru performanță
CREATE INDEX idx_app_updates_current_version 
ON app_updates(is_current_version, published_at DESC);

-- Funcție trigger pentru a seta automat doar o versiune ca fiind curentă
CREATE OR REPLACE FUNCTION set_single_current_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current_version = true AND NEW.status = 'published' THEN
    UPDATE app_updates 
    SET is_current_version = false 
    WHERE is_current_version = true 
    AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicare trigger
DROP TRIGGER IF EXISTS enforce_single_current_version ON app_updates;
CREATE TRIGGER enforce_single_current_version
  BEFORE INSERT OR UPDATE ON app_updates
  FOR EACH ROW
  EXECUTE FUNCTION set_single_current_version();

-- Setare versiunea cea mai recentă publicată ca fiind curentă
UPDATE app_updates 
SET is_current_version = true 
WHERE id = (
  SELECT id 
  FROM app_updates 
  WHERE status = 'published' 
  ORDER BY published_at DESC 
  LIMIT 1
);