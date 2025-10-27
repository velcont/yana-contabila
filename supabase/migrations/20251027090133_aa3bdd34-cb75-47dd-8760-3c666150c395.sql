-- Fix duplicate CUI issue causing "more than one row returned by subquery"

-- Step 1: Delete duplicate entries (keep only the oldest record for each CUI)
-- For records with NULL CUI, we'll keep them all since NULL != NULL in SQL
DELETE FROM companies a
USING companies b
WHERE a.id < b.id 
  AND a.cui = b.cui
  AND a.cui IS NOT NULL;

-- Step 2: Add unique constraint on CUI to prevent future duplicates
-- Using a partial unique index to allow multiple NULL values
CREATE UNIQUE INDEX IF NOT EXISTS unique_cui_not_null 
ON companies (cui) 
WHERE cui IS NOT NULL;

-- Step 3: Add helpful index for better performance on CUI lookups
CREATE INDEX IF NOT EXISTS idx_companies_cui 
ON companies (cui) 
WHERE cui IS NOT NULL;

-- Step 4: Add comment to document the constraint
COMMENT ON INDEX unique_cui_not_null IS 'Ensures CUI uniqueness while allowing multiple NULL values';
