-- Adaugă coloană pentru tracking validări AI Council în tabela analyses
ALTER TABLE public.analyses 
ADD COLUMN IF NOT EXISTS council_validation JSONB DEFAULT NULL;

-- Adaugă index pentru query-uri rapide pe validări
CREATE INDEX IF NOT EXISTS idx_analyses_council_validation 
ON public.analyses USING gin(council_validation) 
WHERE council_validation IS NOT NULL;

-- Adaugă comentariu pentru documentare
COMMENT ON COLUMN public.analyses.council_validation IS 'Rezultatul validării consiliului de AI-uri: {validated, confidence, alerts, recommendations, consensus}';
