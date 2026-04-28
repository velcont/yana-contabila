-- =====================================================
-- CRM Lookup Tables: Lead Sources, Territories, Lost Reasons
-- =====================================================

-- 1. crm_lead_sources
CREATE TABLE public.crm_lead_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#94a3b8',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
CREATE INDEX idx_crm_lead_sources_user ON public.crm_lead_sources(user_id);

ALTER TABLE public.crm_lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own lead sources" ON public.crm_lead_sources
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own lead sources" ON public.crm_lead_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own lead sources" ON public.crm_lead_sources
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own lead sources" ON public.crm_lead_sources
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_crm_lead_sources_updated
  BEFORE UPDATE ON public.crm_lead_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

-- 2. crm_territories
CREATE TABLE public.crm_territories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
CREATE INDEX idx_crm_territories_user ON public.crm_territories(user_id);

ALTER TABLE public.crm_territories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own territories" ON public.crm_territories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own territories" ON public.crm_territories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own territories" ON public.crm_territories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own territories" ON public.crm_territories
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_crm_territories_updated
  BEFORE UPDATE ON public.crm_territories
  FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

-- 3. crm_lost_reasons
CREATE TABLE public.crm_lost_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
CREATE INDEX idx_crm_lost_reasons_user ON public.crm_lost_reasons(user_id);

ALTER TABLE public.crm_lost_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own lost reasons" ON public.crm_lost_reasons
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own lost reasons" ON public.crm_lost_reasons
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own lost reasons" ON public.crm_lost_reasons
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own lost reasons" ON public.crm_lost_reasons
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_crm_lost_reasons_updated
  BEFORE UPDATE ON public.crm_lost_reasons
  FOR EACH ROW EXECUTE FUNCTION public.update_crm_updated_at();

-- =====================================================
-- 4. FK columns on crm_deals & crm_contacts
-- =====================================================

ALTER TABLE public.crm_deals
  ADD COLUMN IF NOT EXISTS lead_source_id UUID REFERENCES public.crm_lead_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES public.crm_territories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lost_reason_id UUID REFERENCES public.crm_lost_reasons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_deals_lead_source ON public.crm_deals(lead_source_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_territory ON public.crm_deals(territory_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_lost_reason ON public.crm_deals(lost_reason_id);

ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS lead_source_id UUID REFERENCES public.crm_lead_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES public.crm_territories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_lead_source ON public.crm_contacts(lead_source_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_territory ON public.crm_contacts(territory_id);

-- =====================================================
-- 5. ensure_default_crm_lookups(user_id) — seed defaults
-- =====================================================

CREATE OR REPLACE FUNCTION public.ensure_default_crm_lookups(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Lead sources
  IF NOT EXISTS (SELECT 1 FROM public.crm_lead_sources WHERE user_id = p_user_id) THEN
    INSERT INTO public.crm_lead_sources (user_id, name, color, display_order) VALUES
      (p_user_id, 'Website',     '#3b82f6', 0),
      (p_user_id, 'Recomandare', '#10b981', 1),
      (p_user_id, 'LinkedIn',    '#0ea5e9', 2),
      (p_user_id, 'Facebook',    '#6366f1', 3),
      (p_user_id, 'Instagram',   '#ec4899', 4),
      (p_user_id, 'Apel rece',   '#94a3b8', 5),
      (p_user_id, 'Eveniment',   '#f59e0b', 6),
      (p_user_id, 'Altă sursă',  '#64748b', 7);
  END IF;

  -- Territories
  IF NOT EXISTS (SELECT 1 FROM public.crm_territories WHERE user_id = p_user_id) THEN
    INSERT INTO public.crm_territories (user_id, name, code, display_order) VALUES
      (p_user_id, 'București-Ilfov', 'B-IF', 0),
      (p_user_id, 'Transilvania',    'TR',   1),
      (p_user_id, 'Moldova',         'MD',   2),
      (p_user_id, 'Muntenia',        'MN',   3),
      (p_user_id, 'Oltenia',         'OL',   4),
      (p_user_id, 'Banat',           'BN',   5),
      (p_user_id, 'Dobrogea',        'DB',   6),
      (p_user_id, 'Internațional',   'INT',  7);
  END IF;

  -- Lost reasons
  IF NOT EXISTS (SELECT 1 FROM public.crm_lost_reasons WHERE user_id = p_user_id) THEN
    INSERT INTO public.crm_lost_reasons (user_id, name, description, display_order) VALUES
      (p_user_id, 'Preț prea mare',          'Clientul a considerat oferta prea scumpă', 0),
      (p_user_id, 'Ales concurența',          'Clientul a ales un competitor',            1),
      (p_user_id, 'Timing nepotrivit',        'Decizia amânată / nu este momentul',       2),
      (p_user_id, 'Lipsă buget',              'Clientul nu are buget alocat',             3),
      (p_user_id, 'Funcționalitate lipsă',    'Produsul nu acoperă o nevoie',             4),
      (p_user_id, 'Lipsă răspuns',            'Clientul a încetat comunicarea',           5),
      (p_user_id, 'Nu este lead calificat',   'Nepotrivire fundamentală',                 6),
      (p_user_id, 'Alt motiv',                NULL,                                       7);
  END IF;
END;
$$;