-- Knowledge Validation Framework: Prevent YANA from learning false information

-- 1. Verified Knowledge Base (source of truth)
CREATE TABLE public.yana_verified_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_category TEXT NOT NULL, -- 'fiscal', 'accounting', 'business', 'legal'
  knowledge_key TEXT NOT NULL,
  verified_value JSONB NOT NULL,
  source_reference TEXT, -- e.g., "Codul Fiscal Art. 47", "OMFP 1802/2014"
  verified_by TEXT, -- 'admin', 'official_source', 'cross_validated'
  verification_date TIMESTAMPTZ DEFAULT now(),
  confidence_score NUMERIC DEFAULT 1.0, -- 1.0 = absolute truth
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(knowledge_category, knowledge_key)
);

-- 2. Source Credibility Configuration
CREATE TABLE public.yana_source_credibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL UNIQUE,
  credibility_score NUMERIC NOT NULL CHECK (credibility_score >= 0 AND credibility_score <= 1),
  description TEXT,
  requires_verification BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default credibility scores
INSERT INTO public.yana_source_credibility (source_type, credibility_score, description, requires_verification) VALUES
  ('official_document', 1.0, 'Documente oficiale (ANAF, legi, ordonanțe)', false),
  ('bank_statement', 0.95, 'Extras de cont bancar', false),
  ('invoice', 0.9, 'Factură fiscală', false),
  ('balance_sheet', 0.9, 'Balanță contabilă uploadată', false),
  ('contract', 0.85, 'Contract semnat', false),
  ('user_document', 0.7, 'Document uploadat de utilizator', true),
  ('user_explicit', 0.5, 'Afirmație explicită a utilizatorului', true),
  ('user_implicit', 0.3, 'Informație dedusă din conversație', true),
  ('user_vague', 0.1, 'Afirmație vagă sau nesigură', true);

-- 3. Flagged Learnings (pending human review)
CREATE TABLE public.yana_flagged_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  conversation_id UUID,
  proposed_knowledge JSONB NOT NULL,
  source_type TEXT REFERENCES yana_source_credibility(source_type),
  credibility_score NUMERIC,
  flag_reason TEXT NOT NULL, -- 'contradiction', 'low_credibility', 'unverifiable', 'suspicious_pattern'
  conflicting_with UUID REFERENCES yana_verified_knowledge(id),
  existing_value JSONB,
  new_value JSONB,
  admin_decision TEXT, -- 'approved', 'rejected', 'modified', 'pending'
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Knowledge Validation Log (audit trail)
CREATE TABLE public.yana_knowledge_validation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  conversation_id UUID,
  input_knowledge JSONB NOT NULL,
  source_type TEXT,
  validation_result TEXT NOT NULL, -- 'accepted', 'flagged', 'rejected', 'merged'
  validation_details JSONB,
  contradictions_found JSONB,
  credibility_assessment JSONB,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Cross-Validation Rules (for automatic verification)
CREATE TABLE public.yana_validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  rule_category TEXT NOT NULL, -- 'fiscal', 'accounting', 'math', 'legal'
  rule_type TEXT NOT NULL, -- 'range_check', 'formula', 'cross_reference', 'pattern'
  rule_definition JSONB NOT NULL,
  error_message TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert core validation rules
INSERT INTO public.yana_validation_rules (rule_name, rule_category, rule_type, rule_definition, error_message) VALUES
  ('TVA Rate Valid', 'fiscal', 'range_check', '{"field": "tva_rate", "min": 0, "max": 25, "valid_values": [0, 5, 9, 19]}', 'Cota TVA invalidă - valori acceptate: 0%, 5%, 9%, 19%'),
  ('Profit Margin Realistic', 'accounting', 'range_check', '{"field": "profit_margin", "min": -100, "max": 90}', 'Marjă de profit nerealistă (>90% sau <-100%)'),
  ('DSO Realistic', 'accounting', 'range_check', '{"field": "dso", "min": 0, "max": 365}', 'DSO peste 365 zile este suspect'),
  ('Balance Equation', 'accounting', 'formula', '{"check": "active_total == pasive_total", "tolerance": 0.01}', 'Balanța nu este echilibrată'),
  ('Cifra Afaceri Consistency', 'fiscal', 'cross_reference', '{"field": "cifra_afaceri", "cross_check": "sum_venituri_clasa_7"}', 'Cifra de afaceri nu corespunde cu veniturile din clasa 7');

-- Enable RLS
ALTER TABLE public.yana_verified_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_source_credibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_flagged_learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_knowledge_validation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_validation_rules ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for verified knowledge
CREATE POLICY "Admin manages verified knowledge"
  ON public.yana_verified_knowledge FOR ALL
  USING (auth.uid() = '01632447-e347-4485-94f1-dc9792599d8e'::uuid);

CREATE POLICY "All can read verified knowledge"
  ON public.yana_verified_knowledge FOR SELECT
  USING (true);

-- Source credibility readable by all
CREATE POLICY "All can read source credibility"
  ON public.yana_source_credibility FOR SELECT
  USING (true);

CREATE POLICY "Admin manages source credibility"
  ON public.yana_source_credibility FOR ALL
  USING (auth.uid() = '01632447-e347-4485-94f1-dc9792599d8e'::uuid);

-- Flagged learnings - admin can manage, users can see their own
CREATE POLICY "Admin manages flagged learnings"
  ON public.yana_flagged_learnings FOR ALL
  USING (auth.uid() = '01632447-e347-4485-94f1-dc9792599d8e'::uuid);

CREATE POLICY "Users see own flagged learnings"
  ON public.yana_flagged_learnings FOR SELECT
  USING (auth.uid() = user_id);

-- Validation log - service role inserts, admin reads all
CREATE POLICY "Admin reads validation log"
  ON public.yana_knowledge_validation_log FOR SELECT
  USING (auth.uid() = '01632447-e347-4485-94f1-dc9792599d8e'::uuid);

-- Validation rules readable by all
CREATE POLICY "All can read validation rules"
  ON public.yana_validation_rules FOR SELECT
  USING (true);

CREATE POLICY "Admin manages validation rules"
  ON public.yana_validation_rules FOR ALL
  USING (auth.uid() = '01632447-e347-4485-94f1-dc9792599d8e'::uuid);

-- Indexes for performance
CREATE INDEX idx_flagged_learnings_pending ON public.yana_flagged_learnings(admin_decision) WHERE admin_decision = 'pending';
CREATE INDEX idx_verified_knowledge_category ON public.yana_verified_knowledge(knowledge_category);
CREATE INDEX idx_validation_log_user ON public.yana_knowledge_validation_log(user_id, created_at DESC);