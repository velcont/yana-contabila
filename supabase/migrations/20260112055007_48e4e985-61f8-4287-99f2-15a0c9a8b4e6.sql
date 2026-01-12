-- 1. Adaugă coloana yana_initiatives_opt_out în profiles (dacă nu există)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'yana_initiatives_opt_out'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN yana_initiatives_opt_out BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 2. Șterge politica RLS incorectă pentru service_role
DROP POLICY IF EXISTS "Service role full access" ON public.yana_initiatives;

-- 3. Recreează politica RLS corect (fără verificare JWT, service_role bypass RLS oricum)
-- Service role are bypass RLS implicit, deci nu avem nevoie de politică specială
-- Păstrăm doar politica pentru utilizatori

-- Adaugă comentariu pentru claritate
COMMENT ON COLUMN public.profiles.yana_initiatives_opt_out IS 'Dacă true, utilizatorul nu primește inițiative proactive de la YANA';