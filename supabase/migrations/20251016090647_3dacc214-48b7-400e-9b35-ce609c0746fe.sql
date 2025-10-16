-- Create saved_strategies table for entrepreneurs
CREATE TABLE public.saved_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  is_favorite BOOLEAN DEFAULT false,
  action_items JSONB DEFAULT '[]'::jsonb,
  related_strategies JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_strategies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own strategies"
  ON public.saved_strategies
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own strategies"
  ON public.saved_strategies
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strategies"
  ON public.saved_strategies
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategies"
  ON public.saved_strategies
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_saved_strategies_user_id ON public.saved_strategies(user_id);
CREATE INDEX idx_saved_strategies_category ON public.saved_strategies(category);

-- Create trigger for updated_at
CREATE TRIGGER update_saved_strategies_updated_at
  BEFORE UPDATE ON public.saved_strategies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create conversation_summaries table for context persistence
CREATE TABLE public.conversation_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  summary TEXT NOT NULL,
  key_points JSONB DEFAULT '[]'::jsonb,
  strategies_discussed JSONB DEFAULT '[]'::jsonb,
  action_items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own summaries"
  ON public.conversation_summaries
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own summaries"
  ON public.conversation_summaries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own summaries"
  ON public.conversation_summaries
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_conversation_summaries_user_id ON public.conversation_summaries(user_id);
CREATE INDEX idx_conversation_summaries_conversation_id ON public.conversation_summaries(conversation_id);