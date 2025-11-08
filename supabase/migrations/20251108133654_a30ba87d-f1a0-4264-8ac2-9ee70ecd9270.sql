-- Add contact columns to job_offers (accountant's contact info)
ALTER TABLE job_offers 
ADD COLUMN IF NOT EXISTS contact_email TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS contact_phone TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT;

COMMENT ON COLUMN job_offers.contact_email IS 'Email contact contabil (poate fi diferit de email login)';
COMMENT ON COLUMN job_offers.contact_phone IS 'Telefon contact contabil';
COMMENT ON COLUMN job_offers.contact_whatsapp IS 'WhatsApp contabil (opțional)';

-- Add contact columns to job_postings (entrepreneur's contact info)
ALTER TABLE job_postings 
ADD COLUMN IF NOT EXISTS contact_email TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS contact_phone TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN job_postings.contact_email IS 'Email contact antreprenor (poate fi diferit de email login)';
COMMENT ON COLUMN job_postings.contact_phone IS 'Telefon contact antreprenor';