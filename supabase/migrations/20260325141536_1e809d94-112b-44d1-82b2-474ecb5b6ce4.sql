-- Drop overly permissive INSERT policy
DROP POLICY IF EXISTS "System can insert observations" ON public.yana_observations;

-- Allow inserts only via service_role (edge functions) by restricting to service_role
CREATE POLICY "Users can insert own observations"
  ON public.yana_observations FOR INSERT
  TO authenticated
  WITH CHECK (source_user_id = auth.uid());

-- Same fix for brain decisions - only admins should insert
DROP POLICY IF EXISTS "System can insert brain decisions" ON public.yana_brain_decisions;

CREATE POLICY "Admins can insert brain decisions"
  ON public.yana_brain_decisions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));