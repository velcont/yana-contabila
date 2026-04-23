
DO $$ BEGIN
  CREATE TYPE public.dream_particle_type AS ENUM ('fermion', 'boson');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.yana_susy_particles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  particle_type public.dream_particle_type NOT NULL,
  source TEXT NOT NULL DEFAULT 'memory',
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_susy_particles_user ON public.yana_susy_particles(user_id, created_at DESC);

ALTER TABLE public.yana_susy_particles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own susy particles" ON public.yana_susy_particles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own susy particles" ON public.yana_susy_particles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own susy particles" ON public.yana_susy_particles FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.yana_susy_dreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  narrative TEXT NOT NULL,
  particles_used JSONB NOT NULL DEFAULT '[]'::jsonb,
  interactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  mood TEXT DEFAULT 'neutral',
  lucidity_score NUMERIC DEFAULT 0.5,
  interpretation TEXT,
  told_to_user BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_susy_dreams_user ON public.yana_susy_dreams(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_susy_dreams_untold ON public.yana_susy_dreams(user_id, told_to_user) WHERE told_to_user = false;

ALTER TABLE public.yana_susy_dreams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own susy dreams" ON public.yana_susy_dreams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own susy dreams" ON public.yana_susy_dreams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own susy dreams" ON public.yana_susy_dreams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own susy dreams" ON public.yana_susy_dreams FOR DELETE USING (auth.uid() = user_id);
