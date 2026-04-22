
-- ========================================
-- CHIEF OF STAFF: Goals (obiective trimestriale)
-- ========================================
CREATE TABLE public.yana_ceo_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  quarter TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-"Q"Q'),
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  priority INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'dropped', 'paused')),
  success_metrics TEXT,
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.yana_ceo_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own goals" ON public.yana_ceo_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own goals" ON public.yana_ceo_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own goals" ON public.yana_ceo_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own goals" ON public.yana_ceo_goals FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_ceo_goals_user_status ON public.yana_ceo_goals(user_id, status);

CREATE TRIGGER update_ceo_goals_updated_at
  BEFORE UPDATE ON public.yana_ceo_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- CHIEF OF STAFF: Contacts (CRM personal)
-- ========================================
CREATE TABLE public.yana_ceo_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT,
  company TEXT,
  tier INTEGER NOT NULL DEFAULT 3 CHECK (tier BETWEEN 1 AND 3),
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  last_interaction_at TIMESTAMPTZ,
  recommended_cadence_days INTEGER DEFAULT 30,
  relationship_context TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  is_stale BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.yana_ceo_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own contacts" ON public.yana_ceo_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own contacts" ON public.yana_ceo_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own contacts" ON public.yana_ceo_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own contacts" ON public.yana_ceo_contacts FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_ceo_contacts_user_tier ON public.yana_ceo_contacts(user_id, tier);
CREATE INDEX idx_ceo_contacts_stale ON public.yana_ceo_contacts(user_id, is_stale) WHERE is_stale = true;

CREATE TRIGGER update_ceo_contacts_updated_at
  BEFORE UPDATE ON public.yana_ceo_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- CHIEF OF STAFF: Tasks (sarcini executive)
-- ========================================
CREATE TABLE public.yana_ceo_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'waiting', 'done', 'cancelled')),
  due_date DATE,
  goal_id UUID REFERENCES public.yana_ceo_goals(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.yana_ceo_contacts(id) ON DELETE SET NULL,
  ai_draft TEXT,
  ai_research TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.yana_ceo_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tasks" ON public.yana_ceo_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tasks" ON public.yana_ceo_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own tasks" ON public.yana_ceo_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own tasks" ON public.yana_ceo_tasks FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_ceo_tasks_user_status ON public.yana_ceo_tasks(user_id, status);
CREATE INDEX idx_ceo_tasks_due ON public.yana_ceo_tasks(user_id, due_date) WHERE status NOT IN ('done', 'cancelled');

CREATE TRIGGER update_ceo_tasks_updated_at
  BEFORE UPDATE ON public.yana_ceo_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- CHIEF OF STAFF: Briefings (istoric briefing-uri)
-- ========================================
CREATE TABLE public.yana_ceo_briefings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  briefing_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content_markdown TEXT NOT NULL,
  goals_referenced UUID[] DEFAULT '{}',
  tasks_referenced UUID[] DEFAULT '{}',
  contacts_referenced UUID[] DEFAULT '{}',
  was_helpful BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.yana_ceo_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own briefings" ON public.yana_ceo_briefings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own briefings" ON public.yana_ceo_briefings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own briefings" ON public.yana_ceo_briefings FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_ceo_briefings_user_date ON public.yana_ceo_briefings(user_id, briefing_date DESC);
