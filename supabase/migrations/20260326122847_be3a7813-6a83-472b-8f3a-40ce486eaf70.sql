
CREATE TABLE public.yana_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id TEXT,
  action_text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'task',
  priority TEXT NOT NULL DEFAULT 'medium',
  deadline TIMESTAMPTZ,
  reminder_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  generated_content TEXT,
  generated_doc_url TEXT,
  completed_at TIMESTAMPTZ,
  source_context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.yana_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own action items"
  ON public.yana_action_items FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own action items"
  ON public.yana_action_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own action items"
  ON public.yana_action_items FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own action items"
  ON public.yana_action_items FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER update_yana_action_items_updated_at
  BEFORE UPDATE ON public.yana_action_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_yana_action_items_user_status ON public.yana_action_items(user_id, status);
CREATE INDEX idx_yana_action_items_reminder ON public.yana_action_items(reminder_at) WHERE reminder_at IS NOT NULL AND status = 'pending';
