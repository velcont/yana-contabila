-- Funcție pentru increment atomic al total_interactions în user_journey
CREATE OR REPLACE FUNCTION public.increment_user_interactions(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO user_journey (
    user_id, 
    total_interactions, 
    first_interaction_at, 
    last_interaction_at
  )
  VALUES (
    p_user_id, 
    1, 
    NOW(), 
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_interactions = user_journey.total_interactions + 1,
    last_interaction_at = NOW();
END;
$$;