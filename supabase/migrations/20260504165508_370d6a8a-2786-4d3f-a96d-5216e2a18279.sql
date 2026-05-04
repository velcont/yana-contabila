
-- 1. Extindere crm_contacts cu câmpuri pentru dosar
ALTER TABLE public.crm_contacts
  ADD COLUMN IF NOT EXISTS fiscal_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS personal_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS birthday date;

COMMENT ON COLUMN public.crm_contacts.fiscal_params IS 'Parametri fiscali: cnp, tip_impozit, tva, regim_tva, plata_tva, casa_marcat, cod_caen, etc.';
COMMENT ON COLUMN public.crm_contacts.personal_info IS 'Zona privată: familie, copii, hobby, preferințe, alergii, evenimente importante.';

-- 2. Tabel note cronologice (dosarul propriu-zis)
CREATE TABLE IF NOT EXISTS public.crm_contact_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general','discutie','privat','fiscal','intalnire','telefon','email')),
  title text,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_contact_notes_contact ON public.crm_contact_notes(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_contact_notes_user ON public.crm_contact_notes(user_id);

ALTER TABLE public.crm_contact_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own contact notes"
  ON public.crm_contact_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own contact notes"
  ON public.crm_contact_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own contact notes"
  ON public.crm_contact_notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own contact notes"
  ON public.crm_contact_notes FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_crm_contact_notes_updated_at
  BEFORE UPDATE ON public.crm_contact_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
