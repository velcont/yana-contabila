-- =====================================================
-- YANA INITIATIVES SYSTEM
-- Permite YANA să ia inițiativa de a contacta utilizatorii
-- cu insight-uri relevante, nu doar să răspundă la întrebări
-- =====================================================

-- Tabel pentru inițiativele proactive ale YANA
CREATE TABLE public.yana_initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Tipul inițiativei
  initiative_type TEXT NOT NULL CHECK (initiative_type IN (
    'proactive_insight',      -- YANA a observat ceva în date
    'relationship_checkin',   -- Revenire după absență
    'goal_proposal',          -- Sugestie de obiectiv
    'learning_share',         -- YANA a învățat ceva nou
    'celebration'             -- Felicitare pentru o realizare
  )),
  
  -- Conținutul mesajului
  content TEXT NOT NULL,
  triggering_insight TEXT,    -- Ce a declanșat această inițiativă
  
  -- Status și scheduling
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- Așteaptă să fie trimisă
    'sent',       -- A fost trimisă
    'cancelled',  -- Anulată (opt-out, rate limit, etc.)
    'expired'     -- A expirat fără să fie trimisă
  )),
  
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now() + interval '1 hour',
  
  -- Tracking
  sent_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pentru scheduler (găsește rapid inițiativele pending)
CREATE INDEX idx_yana_initiatives_pending 
ON public.yana_initiatives(status, scheduled_for) 
WHERE status = 'pending';

-- Index pentru rate limiting (verifică inițiativele recente per user)
CREATE INDEX idx_yana_initiatives_user_recent 
ON public.yana_initiatives(user_id, sent_at DESC) 
WHERE status = 'sent';

-- Adaugă coloana opt-out la profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS yana_initiatives_opt_out BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.yana_initiatives ENABLE ROW LEVEL SECURITY;

-- Politici RLS: utilizatorii văd doar propriile inițiative
CREATE POLICY "Users can view their own initiatives"
ON public.yana_initiatives
FOR SELECT
USING (auth.uid() = user_id);

-- Service role poate face orice (pentru edge functions)
CREATE POLICY "Service role full access to initiatives"
ON public.yana_initiatives
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Comentariu pentru documentație
COMMENT ON TABLE public.yana_initiatives IS 
'Sistem de inițiative proactive YANA. Permite YANA să contacteze utilizatorii cu insight-uri relevante.
Safeguards implementate:
- Rate limiting: max 1 inițiativă/user/24h
- Eligibilitate: relationship_score >= 4
- Quiet hours: 22:00-08:00 (skip)
- Opt-out: profiles.yana_initiatives_opt_out
- Expirare: 7 zile';