-- Fix search_path pentru funcția cleanup_inactive_sessions
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.active_sessions 
  WHERE last_activity < now() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;