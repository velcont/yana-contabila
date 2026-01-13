-- Adaugă câmp opt-out pentru emailuri YANA în profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS yana_emails_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN profiles.yana_emails_enabled IS 'Dacă utilizatorul acceptă emailuri proactive de la YANA';