-- Fix security warning: Set search_path for validate_mood_score function
CREATE OR REPLACE FUNCTION validate_mood_score() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mood_score IS NOT NULL AND (NEW.mood_score < 1 OR NEW.mood_score > 5) THEN
    RAISE EXCEPTION 'mood_score must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;