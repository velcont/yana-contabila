CREATE OR REPLACE FUNCTION public.increment_yana_agent_stats(
  p_agent_id uuid,
  p_success boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.yana_generated_agents
  SET 
    execution_count = COALESCE(execution_count, 0) + 1,
    success_count = COALESCE(success_count, 0) + CASE WHEN p_success THEN 1 ELSE 0 END,
    last_executed_at = NOW()
  WHERE id = p_agent_id;
END;
$$;