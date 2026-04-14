-- Tabel pentru Meta-Learning Loop + Safety Envelope
CREATE TABLE public.yana_meta_learning (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_period TEXT NOT NULL,
  total_corrections INTEGER NOT NULL DEFAULT 0,
  corrections_by_domain JSONB NOT NULL DEFAULT '{}',
  blind_spots_detected TEXT[] DEFAULT '{}',
  learning_goals_generated JSONB DEFAULT '[]',
  coherence_score NUMERIC(4,3) DEFAULT 0.9,
  capacity_index NUMERIC(4,3) DEFAULT 0.5,
  entropy_delta NUMERIC(6,3) DEFAULT 0,
  safety_violations INTEGER NOT NULL DEFAULT 0,
  rollback_triggered BOOLEAN NOT NULL DEFAULT false,
  safety_envelope JSONB DEFAULT '{"max_corrections_per_day": 20, "ground_truth_immutable": true, "max_self_modifications_per_cycle": 5}',
  meta_insights TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.yana_meta_learning ENABLE ROW LEVEL SECURITY;

-- Doar adminii pot citi
CREATE POLICY "Admins can read meta-learning" 
ON public.yana_meta_learning 
FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- Doar adminii pot insera (edge functions folosesc service role)
CREATE POLICY "Admins can insert meta-learning" 
ON public.yana_meta_learning 
FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index pe perioada de evaluare
CREATE INDEX idx_yana_meta_learning_period ON public.yana_meta_learning(evaluation_period);

-- Trigger updated_at
CREATE TRIGGER update_yana_meta_learning_updated_at
BEFORE UPDATE ON public.yana_meta_learning
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();