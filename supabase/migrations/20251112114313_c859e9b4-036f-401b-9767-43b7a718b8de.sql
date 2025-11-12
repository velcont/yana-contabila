-- FAZA 1: Multi-Agent Validation System - Database Schema

-- ============================================================================
-- Tabel 1: strategic_advisor_facts - Stocarea persistentă a datelor validate
-- ============================================================================
CREATE TABLE IF NOT EXISTS strategic_advisor_facts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Categorii: 'financial', 'market', 'company', 'competition'
  fact_category TEXT NOT NULL CHECK (fact_category IN ('financial', 'market', 'company', 'competition')),
  
  -- Key: ex. 'cifra_afaceri_2023', 'profit_net_2024', 'dso', 'concurent_1_pret'
  fact_key TEXT NOT NULL,
  
  -- Value: ex. '500000', '-25000', '45', '150 RON/unitate'
  fact_value TEXT NOT NULL,
  
  -- Unit: ex. 'RON', 'EUR', '%', 'zile', 'angajati'
  fact_unit TEXT,
  
  -- Confidence: 0.0-1.0 (cât de sigur e AI-ul că e corect)
  confidence NUMERIC DEFAULT 1.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  
  -- Source: 'user_direct', 'balance_sheet', 'ai_extraction'
  source TEXT DEFAULT 'user_direct' CHECK (source IN ('user_direct', 'balance_sheet', 'ai_extraction')),
  
  -- Validation status: 'validated', 'conflicted', 'outdated'
  status TEXT DEFAULT 'validated' CHECK (status IN ('validated', 'conflicted', 'outdated')),
  
  -- Metadata JSON: ex. context original, conflict details
  metadata JSONB DEFAULT '{}',
  
  validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint pentru upsert logic
  UNIQUE(conversation_id, fact_key)
);

-- Indexes pentru performance
CREATE INDEX IF NOT EXISTS idx_facts_conversation ON strategic_advisor_facts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_facts_user ON strategic_advisor_facts(user_id);
CREATE INDEX IF NOT EXISTS idx_facts_category_key ON strategic_advisor_facts(fact_category, fact_key);
CREATE INDEX IF NOT EXISTS idx_facts_status ON strategic_advisor_facts(status);
CREATE INDEX IF NOT EXISTS idx_facts_updated ON strategic_advisor_facts(updated_at DESC);

-- RLS Policies
ALTER TABLE strategic_advisor_facts ENABLE ROW LEVEL SECURITY;

-- Users can view their own facts
DROP POLICY IF EXISTS "Users can view own facts" ON strategic_advisor_facts;
CREATE POLICY "Users can view own facts"
  ON strategic_advisor_facts FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert facts (called from edge function)
DROP POLICY IF EXISTS "Service can insert facts" ON strategic_advisor_facts;
CREATE POLICY "Service can insert facts"
  ON strategic_advisor_facts FOR INSERT
  WITH CHECK (true);

-- Service role can update facts
DROP POLICY IF EXISTS "Service can update facts" ON strategic_advisor_facts;
CREATE POLICY "Service can update facts"
  ON strategic_advisor_facts FOR UPDATE
  USING (true);

-- Users can delete their own facts (cleanup)
DROP POLICY IF EXISTS "Users can delete own facts" ON strategic_advisor_facts;
CREATE POLICY "Users can delete own facts"
  ON strategic_advisor_facts FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================================
-- Tabel 2: strategic_advisor_validations - Audit log pentru AI responses
-- ============================================================================
CREATE TABLE IF NOT EXISTS strategic_advisor_validations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  
  -- Agent 1 (Validator) response
  validator_response JSONB NOT NULL,
  validator_model TEXT DEFAULT 'google/gemini-2.5-flash',
  validator_tokens_used INTEGER DEFAULT 0,
  
  -- Agent 2 (Strategist) response (NULL dacă validarea a eșuat)
  strategist_response TEXT,
  strategist_model TEXT DEFAULT 'anthropic/claude-sonnet-4.5',
  strategist_tokens_used INTEGER DEFAULT 0,
  
  -- Validation result
  validation_status TEXT NOT NULL CHECK (validation_status IN ('approved', 'data_missing', 'conflict_detected')),
  missing_fields JSONB DEFAULT '[]',
  conflicts JSONB DEFAULT '[]',
  
  -- Cost tracking (in cents/bani)
  total_cost_cents INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes pentru performance și analytics
CREATE INDEX IF NOT EXISTS idx_validations_conversation ON strategic_advisor_validations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_validations_user ON strategic_advisor_validations(user_id);
CREATE INDEX IF NOT EXISTS idx_validations_status ON strategic_advisor_validations(validation_status);
CREATE INDEX IF NOT EXISTS idx_validations_created ON strategic_advisor_validations(created_at DESC);

-- RLS Policies
ALTER TABLE strategic_advisor_validations ENABLE ROW LEVEL SECURITY;

-- Users can view their own validation logs
DROP POLICY IF EXISTS "Users can view own validations" ON strategic_advisor_validations;
CREATE POLICY "Users can view own validations"
  ON strategic_advisor_validations FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert validation logs
DROP POLICY IF EXISTS "Service can insert validations" ON strategic_advisor_validations;
CREATE POLICY "Service can insert validations"
  ON strategic_advisor_validations FOR INSERT
  WITH CHECK (true);

-- Service role can update validation logs (pentru strategist response)
DROP POLICY IF EXISTS "Service can update validations" ON strategic_advisor_validations;
CREATE POLICY "Service can update validations"
  ON strategic_advisor_validations FOR UPDATE
  USING (true);


-- ============================================================================
-- View: strategic_facts_summary - Pentru UI dashboard
-- ============================================================================
CREATE OR REPLACE VIEW strategic_facts_summary AS
SELECT 
  conversation_id,
  user_id,
  fact_category,
  COUNT(*) as total_facts,
  COUNT(CASE WHEN status = 'validated' THEN 1 END) as validated_count,
  COUNT(CASE WHEN status = 'conflicted' THEN 1 END) as conflicted_count,
  COUNT(CASE WHEN status = 'outdated' THEN 1 END) as outdated_count,
  AVG(confidence) as avg_confidence,
  MAX(updated_at) as last_updated
FROM strategic_advisor_facts
GROUP BY conversation_id, user_id, fact_category;

-- Grant access to view
GRANT SELECT ON strategic_facts_summary TO authenticated;


-- ============================================================================
-- Function: Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_strategic_facts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pentru auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_strategic_facts_updated_at ON strategic_advisor_facts;
CREATE TRIGGER trigger_update_strategic_facts_updated_at
  BEFORE UPDATE ON strategic_advisor_facts
  FOR EACH ROW
  EXECUTE FUNCTION update_strategic_facts_updated_at();


-- ============================================================================
-- Comments pentru documentare
-- ============================================================================
COMMENT ON TABLE strategic_advisor_facts IS 'Persistent storage for validated business facts extracted by Yana Strategica AI validator agent';
COMMENT ON TABLE strategic_advisor_validations IS 'Audit log for multi-agent validation system (Validator + Strategist) in Yana Strategica';
COMMENT ON VIEW strategic_facts_summary IS 'Aggregated summary of validated facts per conversation for UI dashboard';

COMMENT ON COLUMN strategic_advisor_facts.confidence IS 'AI confidence score 0.0-1.0: 1.0=explicit number, 0.8=inferred, 0.5=vague estimate';
COMMENT ON COLUMN strategic_advisor_facts.status IS 'validated=active fact, conflicted=needs user resolution, outdated=superseded by newer data';
COMMENT ON COLUMN strategic_advisor_validations.validation_status IS 'approved=ready for strategy, data_missing=incomplete, conflict_detected=contradictory data';