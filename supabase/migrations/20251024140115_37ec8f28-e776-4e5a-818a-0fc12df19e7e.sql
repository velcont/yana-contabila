-- Fix: Setare search_path pentru funcția trigger
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
$$ LANGUAGE plpgsql 
SET search_path = '';