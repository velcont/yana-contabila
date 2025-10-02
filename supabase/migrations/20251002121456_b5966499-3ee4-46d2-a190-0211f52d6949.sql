-- Adaugă coloana company_name în tabela analyses pentru suport multiple firme
ALTER TABLE public.analyses 
ADD COLUMN company_name TEXT;

-- Adaugă un index pentru performanță la filtrarea după companie
CREATE INDEX idx_analyses_company_name ON public.analyses(company_name);

-- Actualizează înregistrările existente cu un nume de companie implicit
UPDATE public.analyses 
SET company_name = 'Firma Principală' 
WHERE company_name IS NULL;