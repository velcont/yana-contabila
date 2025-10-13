
-- Script pentru a crea companii din analize existente și a le lega
-- Step 1: Create companies from analyses for accountants (where company_name in filename)

DO $$
DECLARE
    analysis_record RECORD;
    extracted_company_name TEXT;
    company_uuid UUID;
    user_profile RECORD;
BEGIN
    -- Loop through all analyses that don't have a company_id
    FOR analysis_record IN 
        SELECT a.id as analysis_id, a.user_id, a.file_name, a.company_name
        FROM analyses a
        WHERE a.company_id IS NULL
        AND a.file_name IS NOT NULL
    LOOP
        -- Get user profile to check if accountant
        SELECT * INTO user_profile 
        FROM profiles 
        WHERE id = analysis_record.user_id;
        
        -- Extract company name from filename (looking for patterns like "Partium srl", "Innovative srl", etc.)
        extracted_company_name := NULL;
        
        -- Try to extract company name from filename
        -- Pattern: text before date pattern (assumes company name comes before date)
        IF analysis_record.file_name ~* '([a-zA-Z\s]+(?:srl|sa|scs|snc|pfa|ii|com|ltd))\s*[-\s]*\d{2,8}' THEN
            extracted_company_name := (regexp_match(analysis_record.file_name, '([a-zA-Z\s]+(?:srl|sa|scs|snc|pfa|ii|com|ltd))', 'i'))[1];
            extracted_company_name := TRIM(extracted_company_name);
        END IF;
        
        -- If we found a company name in filename
        IF extracted_company_name IS NOT NULL AND LENGTH(extracted_company_name) > 3 THEN
            -- Check if company already exists for this user
            SELECT id INTO company_uuid
            FROM companies
            WHERE user_id = analysis_record.user_id
            AND LOWER(company_name) = LOWER(extracted_company_name)
            LIMIT 1;
            
            -- If company doesn't exist, create it
            IF company_uuid IS NULL THEN
                INSERT INTO companies (
                    user_id,
                    company_name,
                    is_own_company,
                    managed_by_accountant_id
                )
                VALUES (
                    analysis_record.user_id,
                    extracted_company_name,
                    false,
                    CASE 
                        WHEN user_profile.subscription_type = 'accounting_firm' 
                        THEN analysis_record.user_id 
                        ELSE NULL 
                    END
                )
                RETURNING id INTO company_uuid;
                
                RAISE NOTICE 'Created company: % (ID: %)', extracted_company_name, company_uuid;
            END IF;
            
            -- Link analysis to company
            UPDATE analyses
            SET 
                company_id = company_uuid,
                company_name = extracted_company_name
            WHERE id = analysis_record.analysis_id;
            
            RAISE NOTICE 'Linked analysis % to company %', analysis_record.analysis_id, extracted_company_name;
        END IF;
    END LOOP;
END $$;
