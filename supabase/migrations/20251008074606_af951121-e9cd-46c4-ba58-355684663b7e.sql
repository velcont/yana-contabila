-- Adaugă câmp pentru status versiune
ALTER TABLE public.app_updates 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft' 
CHECK (status IN ('draft', 'in_progress', 'published'));

-- Actualizează status-ul update-urilor existente publicate
UPDATE public.app_updates 
SET status = 'published' 
WHERE is_published = true;

-- Adaugă comentariu pentru câmp
COMMENT ON COLUMN public.app_updates.status IS 'Status versiune: draft, in_progress, published';