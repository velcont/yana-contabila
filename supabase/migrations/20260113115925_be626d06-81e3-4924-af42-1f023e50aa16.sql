-- Adaugă coloana email_sent_at în yana_initiatives pentru tracking anti-loop
ALTER TABLE yana_initiatives ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN yana_initiatives.email_sent_at IS 'Timestamp când emailul real a fost trimis prin Resend';