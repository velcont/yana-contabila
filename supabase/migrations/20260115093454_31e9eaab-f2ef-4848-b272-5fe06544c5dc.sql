-- Fix version typo: 4.0.0. → 4.0.0
UPDATE app_updates 
SET version = '4.0.0' 
WHERE version = '4.0.0.';