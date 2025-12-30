-- =============================================================================
-- MIGRARE ÎMBUNĂTĂȚITĂ: Atribuie company_id la yana_conversations existente
-- Strategii multiple de matching cu logging
-- =============================================================================

-- Strategia 1: Match EXACT pe company name (case insensitive)
UPDATE yana_conversations yc
SET company_id = c.id
FROM companies c
WHERE yc.company_id IS NULL
  AND yc.user_id = c.user_id
  AND yc.metadata IS NOT NULL
  AND yc.metadata->>'companyName' IS NOT NULL
  AND LOWER(TRIM(yc.metadata->>'companyName')) = LOWER(TRIM(c.company_name));

-- Strategia 2: Match pe accountant's managed companies (dacă user e contabil)
UPDATE yana_conversations yc
SET company_id = c.id
FROM companies c
WHERE yc.company_id IS NULL
  AND c.managed_by_accountant_id = yc.user_id
  AND yc.metadata IS NOT NULL
  AND yc.metadata->>'companyName' IS NOT NULL
  AND LOWER(TRIM(yc.metadata->>'companyName')) = LOWER(TRIM(c.company_name));

-- Strategia 3: Match pe CUI din metadata (dacă există)
UPDATE yana_conversations yc
SET company_id = c.id
FROM companies c
WHERE yc.company_id IS NULL
  AND c.cui IS NOT NULL
  AND yc.metadata IS NOT NULL
  AND (
    yc.metadata->>'cui' = c.cui
    OR yc.metadata->>'CUI' = c.cui
  );

-- Strategia 4: Match fuzzy - primul cuvânt din numele firmei
UPDATE yana_conversations yc
SET company_id = c.id
FROM companies c
WHERE yc.company_id IS NULL
  AND (c.user_id = yc.user_id OR c.managed_by_accountant_id = yc.user_id)
  AND yc.metadata IS NOT NULL
  AND yc.metadata->>'companyName' IS NOT NULL
  AND LENGTH(yc.metadata->>'companyName') > 5
  AND SPLIT_PART(LOWER(TRIM(yc.metadata->>'companyName')), ' ', 1) = 
      SPLIT_PART(LOWER(TRIM(c.company_name)), ' ', 1)
  AND LENGTH(SPLIT_PART(LOWER(TRIM(yc.metadata->>'companyName')), ' ', 1)) > 3;

-- Strategia 5: Match pe conținut parțial (firmă conține companyName sau invers)
UPDATE yana_conversations yc
SET company_id = c.id
FROM companies c
WHERE yc.company_id IS NULL
  AND (c.user_id = yc.user_id OR c.managed_by_accountant_id = yc.user_id)
  AND yc.metadata IS NOT NULL
  AND yc.metadata->>'companyName' IS NOT NULL
  AND LENGTH(yc.metadata->>'companyName') > 5
  AND (
    c.company_name ILIKE '%' || (yc.metadata->>'companyName') || '%'
    OR yc.metadata->>'companyName' ILIKE '%' || c.company_name || '%'
  );

-- =============================================================================
-- Același lucru pentru ai_conversations (memoria AI)
-- =============================================================================

-- Strategia 1: Match EXACT pe company name din context
UPDATE ai_conversations ac
SET company_id = c.id
FROM companies c
WHERE ac.company_id IS NULL
  AND ac.user_id = c.user_id
  AND ac.context IS NOT NULL
  AND ac.context->>'companyName' IS NOT NULL
  AND LOWER(TRIM(ac.context->>'companyName')) = LOWER(TRIM(c.company_name));

-- Strategia 2: Match pe accountant's managed companies
UPDATE ai_conversations ac
SET company_id = c.id
FROM companies c
WHERE ac.company_id IS NULL
  AND c.managed_by_accountant_id = ac.user_id
  AND ac.context IS NOT NULL
  AND ac.context->>'companyName' IS NOT NULL
  AND LOWER(TRIM(ac.context->>'companyName')) = LOWER(TRIM(c.company_name));

-- Strategia 3: Match fuzzy pentru ai_conversations
UPDATE ai_conversations ac
SET company_id = c.id
FROM companies c
WHERE ac.company_id IS NULL
  AND (c.user_id = ac.user_id OR c.managed_by_accountant_id = ac.user_id)
  AND ac.context IS NOT NULL
  AND ac.context->>'companyName' IS NOT NULL
  AND LENGTH(ac.context->>'companyName') > 5
  AND SPLIT_PART(LOWER(TRIM(ac.context->>'companyName')), ' ', 1) = 
      SPLIT_PART(LOWER(TRIM(c.company_name)), ' ', 1)
  AND LENGTH(SPLIT_PART(LOWER(TRIM(ac.context->>'companyName')), ' ', 1)) > 3;