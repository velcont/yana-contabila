-- Adaugă coloană pentru credit de test în tabelul profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS trial_credit_remaining DECIMAL(10, 2) DEFAULT 10.00;

-- Setează 10 lei credit pentru utilizatori existenți fără abonament activ
UPDATE profiles 
SET trial_credit_remaining = 10.00 
WHERE (subscription_status IS NULL 
   OR subscription_status = 'inactive'
   OR subscription_status = '')
  AND trial_credit_remaining IS NULL;

-- Comentariu: Această migrare adaugă suport pentru credit de test
-- Toți utilizatorii fără abonament plătit vor primi 10 lei credit de test
-- pentru a testa funcționalitatea Yana Strategică înainte de a cumpăra abonament