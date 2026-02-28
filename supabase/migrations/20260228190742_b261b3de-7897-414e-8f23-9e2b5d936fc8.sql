
-- Tabel: yana_client_profiles (profilul persistent per client)
CREATE TABLE public.yana_client_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_domain TEXT,
  company_size TEXT DEFAULT 'unknown',
  language_complexity TEXT DEFAULT 'moderate',
  communication_style TEXT DEFAULT 'conversational',
  recurring_problems JSONB DEFAULT '[]'::jsonb,
  learned_corrections JSONB DEFAULT '[]'::jsonb,
  anticipation_triggers JSONB DEFAULT '[]'::jsonb,
  preferred_topics TEXT[] DEFAULT '{}',
  personality_notes TEXT,
  interaction_patterns JSONB DEFAULT '{}'::jsonb,
  last_profile_update TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT yana_client_profiles_user_id_unique UNIQUE (user_id)
);

-- RLS
ALTER TABLE public.yana_client_profiles ENABLE ROW LEVEL SECURITY;

-- Utilizatorul vede doar propriul profil
CREATE POLICY "Users can view own profile" ON public.yana_client_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Service role poate face orice (edge functions)
CREATE POLICY "Service role full access" ON public.yana_client_profiles
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER update_yana_client_profiles_updated_at
  BEFORE UPDATE ON public.yana_client_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index
CREATE INDEX idx_yana_client_profiles_user_id ON public.yana_client_profiles(user_id);
