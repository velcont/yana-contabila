-- 3-TIER KNOWLEDGE CREDIBILITY SYSTEM
-- Tier 1: User-overridable (lowest)
-- Tier 2: Admin-overridable (medium)
-- Tier 3: IMMUTABLE Ground Truth (highest - NEVER changes)

-- 1. Add tier column to verified knowledge
ALTER TABLE public.yana_verified_knowledge 
ADD COLUMN IF NOT EXISTS credibility_tier TEXT DEFAULT 'user_overridable' 
CHECK (credibility_tier IN ('user_overridable', 'admin_overridable', 'immutable'));

ALTER TABLE public.yana_verified_knowledge 
ADD COLUMN IF NOT EXISTS is_ground_truth BOOLEAN DEFAULT false;

ALTER TABLE public.yana_verified_knowledge 
ADD COLUMN IF NOT EXISTS legal_reference TEXT;

ALTER TABLE public.yana_verified_knowledge 
ADD COLUMN IF NOT EXISTS effective_date DATE;

ALTER TABLE public.yana_verified_knowledge 
ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- 2. Create IMMUTABLE ground truth table (separate for extra protection)
CREATE TABLE public.yana_ground_truth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'fiscal', 'accounting', 'legal', 'social'
  subcategory TEXT, -- 'TVA', 'impozit_profit', 'contributii', etc.
  fact_key TEXT NOT NULL,
  fact_value JSONB NOT NULL,
  legal_source TEXT NOT NULL, -- e.g., "Codul Fiscal Art. 291", "OMFP 1802/2014"
  legal_source_url TEXT,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE, -- NULL = still valid
  romania_specific BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMPTZ DEFAULT now(),
  verified_by TEXT DEFAULT 'system',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category, fact_key, effective_from)
);

-- 3. Create escalation log for critical errors
CREATE TABLE public.yana_learning_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  conversation_id UUID,
  escalation_type TEXT NOT NULL, -- 'wrong_tax_advice', 'legal_contradiction', 'accounting_error', 'critical_misinformation'
  severity TEXT NOT NULL DEFAULT 'high' CHECK (severity IN ('medium', 'high', 'critical')),
  proposed_knowledge JSONB,
  conflicting_ground_truth UUID REFERENCES yana_ground_truth(id),
  ground_truth_value JSONB,
  user_message TEXT,
  ai_response TEXT,
  clarification_requested TEXT,
  user_clarification TEXT,
  resolution_status TEXT DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'resolved', 'dismissed', 'confirmed_error')),
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  learning_blocked BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Insert IMMUTABLE Romanian tax ground truth (2024-2025 valid)
INSERT INTO public.yana_ground_truth (category, subcategory, fact_key, fact_value, legal_source, effective_from) VALUES
-- TVA
('fiscal', 'TVA', 'cota_tva_standard', '19', 'Codul Fiscal Art. 291 alin. (1)', '2016-01-01'),
('fiscal', 'TVA', 'cota_tva_redusa_9', '9', 'Codul Fiscal Art. 291 alin. (2)', '2016-01-01'),
('fiscal', 'TVA', 'cota_tva_redusa_5', '5', 'Codul Fiscal Art. 291 alin. (3)', '2016-01-01'),
('fiscal', 'TVA', 'plafon_inregistrare_tva', '300000', 'Codul Fiscal Art. 310', '2024-01-01'),
('fiscal', 'TVA', 'plafon_tva_la_incasare', '4500000', 'Codul Fiscal Art. 282', '2024-01-01'),

-- Impozit pe profit
('fiscal', 'impozit_profit', 'cota_impozit_profit', '16', 'Codul Fiscal Art. 17', '2005-01-01'),
('fiscal', 'impozit_profit', 'cota_impozit_micro_1_angajat', '1', 'Codul Fiscal Art. 51', '2023-01-01'),
('fiscal', 'impozit_profit', 'cota_impozit_micro_0_angajati', '3', 'Codul Fiscal Art. 51', '2023-01-01'),
('fiscal', 'impozit_profit', 'plafon_microintreprindere_eur', '500000', 'Codul Fiscal Art. 47', '2024-01-01'),

-- Dividende
('fiscal', 'dividende', 'cota_impozit_dividende', '8', 'Codul Fiscal Art. 97', '2023-01-01'),
('fiscal', 'dividende', 'cass_dividende', '10', 'Codul Fiscal Art. 176', '2024-01-01'),
('fiscal', 'dividende', 'plafon_cass_dividende_salarii_minime', '60', 'OUG 168/2022', '2024-01-01'),

-- Contribuții sociale
('fiscal', 'contributii', 'cota_cas_angajat', '25', 'Codul Fiscal Art. 138', '2018-01-01'),
('fiscal', 'contributii', 'cota_cass_angajat', '10', 'Codul Fiscal Art. 156', '2018-01-01'),
('fiscal', 'contributii', 'cota_cam_angajator', '2.25', 'Codul Fiscal Art. 220', '2018-01-01'),
('fiscal', 'contributii', 'salariu_minim_brut_2024', '3300', 'HG 900/2023', '2024-01-01'),
('fiscal', 'contributii', 'salariu_minim_brut_2025', '4050', 'HG 1447/2024', '2025-01-01'),

-- Impozit pe venit
('fiscal', 'impozit_venit', 'cota_impozit_venit', '10', 'Codul Fiscal Art. 64', '2018-01-01'),
('fiscal', 'impozit_venit', 'deducere_personala_baza', '550', 'Codul Fiscal Art. 77', '2024-01-01'),

-- Plafoane și limite
('fiscal', 'plafoane', 'plafon_casa_lei', '50000', 'OUG 28/1999 Art. 4', '1999-01-01'),
('fiscal', 'plafoane', 'plafon_plata_numerar_b2b', '10000', 'Legea 70/2015', '2015-01-01'),
('fiscal', 'plafoane', 'plafon_plata_numerar_b2c', '10000', 'Legea 70/2015', '2015-01-01'),

-- Contabilitate
('accounting', 'generale', 'praguri_audit_ca', '35000000', 'OMFP 1802/2014', '2015-01-01'),
('accounting', 'generale', 'praguri_audit_active', '17500000', 'OMFP 1802/2014', '2015-01-01'),
('accounting', 'generale', 'praguri_audit_angajati', '50', 'OMFP 1802/2014', '2015-01-01'),
('accounting', 'amortizare', 'metoda_liniara_default', 'true', 'OMFP 1802/2014', '2015-01-01'),
('accounting', 'inventar', 'limita_obiecte_inventar', '2500', 'OMFP 1802/2014', '2015-01-01'),

-- Termene fiscale
('fiscal', 'termene', 'termen_d300_lunar', '25', 'Codul Fiscal Art. 323', '2016-01-01'),
('fiscal', 'termene', 'termen_d100_lunar', '25', 'Codul Fiscal Art. 147', '2016-01-01'),
('fiscal', 'termene', 'termen_d112_lunar', '25', 'Codul Fiscal Art. 147', '2016-01-01'),
('fiscal', 'termene', 'termen_bilant_anual', '150', 'Legea 82/1991 Art. 28', '2016-01-01');

-- 5. Enable RLS
ALTER TABLE public.yana_ground_truth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_learning_escalations ENABLE ROW LEVEL SECURITY;

-- Ground truth: EVERYONE can read, NO ONE can modify (except via migrations)
CREATE POLICY "Everyone can read ground truth"
  ON public.yana_ground_truth FOR SELECT
  USING (true);

-- NO insert/update/delete policies = immutable!

-- Escalations: Admin sees all, users see their own
CREATE POLICY "Admin manages escalations"
  ON public.yana_learning_escalations FOR ALL
  USING (auth.uid() = '01632447-e347-4485-94f1-dc9792599d8e'::uuid);

CREATE POLICY "Users see own escalations"
  ON public.yana_learning_escalations FOR SELECT
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_ground_truth_category ON public.yana_ground_truth(category, fact_key);
CREATE INDEX idx_ground_truth_valid ON public.yana_ground_truth(effective_from, effective_until);
CREATE INDEX idx_escalations_pending ON public.yana_learning_escalations(resolution_status) WHERE resolution_status = 'pending';