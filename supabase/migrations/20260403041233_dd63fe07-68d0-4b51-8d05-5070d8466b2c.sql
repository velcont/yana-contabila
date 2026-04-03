CREATE POLICY "Users delete own memory" ON public.yana_semantic_memory
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());