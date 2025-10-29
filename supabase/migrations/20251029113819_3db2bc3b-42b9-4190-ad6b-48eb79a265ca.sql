-- FIX: analyses should CASCADE when company deleted
ALTER TABLE public.analyses
DROP CONSTRAINT IF EXISTS analyses_company_id_fkey;

ALTER TABLE public.analyses
ADD CONSTRAINT analyses_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Also fix ai_conversations if needed
ALTER TABLE public.ai_conversations
DROP CONSTRAINT IF EXISTS ai_conversations_company_id_fkey;

ALTER TABLE public.ai_conversations
ADD CONSTRAINT ai_conversations_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;