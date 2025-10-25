-- Funcție pentru linking automat analize orfane cu companii
CREATE OR REPLACE FUNCTION link_orphan_analyses_to_companies(p_user_id UUID)
RETURNS TABLE(
  analysis_id UUID,
  linked_company_id UUID,
  company_name TEXT,
  matched_by TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  analysis_record RECORD;
  extracted_cui TEXT;
  matched_company_id UUID;
  matched_company_name TEXT;
BEGIN
  FOR analysis_record IN 
    SELECT id, file_name 
    FROM analyses 
    WHERE user_id = p_user_id 
      AND company_id IS NULL
  LOOP
    matched_company_id := NULL;
    matched_company_name := NULL;
    
    -- Extrage CUI din file_name (8 cifre înainte de .xls)
    extracted_cui := substring(analysis_record.file_name from '(\d{8})\.xls$');
    
    IF extracted_cui IS NOT NULL THEN
      -- Caută compania cu CUI matching
      SELECT c.id, c.company_name INTO matched_company_id, matched_company_name
      FROM companies c
      WHERE c.cui = extracted_cui
        AND c.managed_by_accountant_id = p_user_id
      LIMIT 1;
      
      IF matched_company_id IS NOT NULL THEN
        -- Update analysis cu company_id găsit
        UPDATE analyses 
        SET company_id = matched_company_id
        WHERE id = analysis_record.id;
        
        RETURN QUERY SELECT 
          analysis_record.id, 
          matched_company_id, 
          matched_company_name,
          'CUI'::TEXT;
      END IF;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION link_orphan_analyses_to_companies IS 
'Auto-link analyses with NULL company_id to companies by extracting CUI from filename';