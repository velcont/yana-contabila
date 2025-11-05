-- Create table for balance confirmation history
CREATE TABLE public.balance_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  cui TEXT,
  company_name TEXT NOT NULL,
  accounts_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.balance_confirmations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own confirmations"
  ON public.balance_confirmations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own confirmations"
  ON public.balance_confirmations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own confirmations"
  ON public.balance_confirmations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_balance_confirmations_user_id ON public.balance_confirmations(user_id);
CREATE INDEX idx_balance_confirmations_created_at ON public.balance_confirmations(created_at DESC);