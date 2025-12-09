-- Create user_personal_profile table for Yana personality features
CREATE TABLE public.user_personal_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_name TEXT,
  detected_gender TEXT CHECK (detected_gender IN ('male', 'female', 'unknown')),
  relationship_level INTEGER DEFAULT 1 CHECK (relationship_level BETWEEN 1 AND 5),
  total_conversations INTEGER DEFAULT 0,
  last_interaction_at TIMESTAMPTZ,
  personal_notes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_personal_profile ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own profile
CREATE POLICY "Users can view own personal profile"
ON public.user_personal_profile
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personal profile"
ON public.user_personal_profile
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personal profile"
ON public.user_personal_profile
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own personal profile"
ON public.user_personal_profile
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_personal_profile_updated_at
BEFORE UPDATE ON public.user_personal_profile
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_user_personal_profile_user_id ON public.user_personal_profile(user_id);