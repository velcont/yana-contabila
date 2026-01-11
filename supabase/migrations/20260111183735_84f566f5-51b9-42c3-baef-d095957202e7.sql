-- ============================================
-- YANA Long-term Intentions + Error Recognition
-- ============================================

-- 1. Creare tabel yana_intentions
CREATE TABLE IF NOT EXISTS yana_intentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intention_type TEXT NOT NULL CHECK (intention_type IN ('user', 'relationship', 'self')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  intention TEXT NOT NULL,
  intention_hash TEXT,
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  reason TEXT,
  triggered_by TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'abandoned', 'paused', 'expired')),
  progress_notes JSONB DEFAULT '[]',
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  success_criteria TEXT,
  achieved_at TIMESTAMPTZ,
  last_evaluated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '90 days')
);

-- Index pentru deduplicare
CREATE UNIQUE INDEX IF NOT EXISTS idx_yana_intentions_hash 
ON yana_intentions(intention_hash) WHERE status = 'active';

-- Index pentru queries
CREATE INDEX IF NOT EXISTS idx_yana_intentions_user_status 
ON yana_intentions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_yana_intentions_type_status 
ON yana_intentions(intention_type, status);

-- 2. Creare tabel yana_acknowledged_errors
CREATE TABLE IF NOT EXISTS yana_acknowledged_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID,
  error_type TEXT CHECK (error_type IN ('factual', 'prediction', 'advice', 'tone', 'assumption', 'misunderstanding')),
  original_statement TEXT NOT NULL,
  correction TEXT NOT NULL,
  user_feedback TEXT,
  why_wrong TEXT,
  confidence_before NUMERIC(3,2) DEFAULT 0.70,
  confidence_after NUMERIC(3,2),
  lesson_learned TEXT,
  capability_affected TEXT,
  recovery_action TEXT,
  acknowledged_publicly BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_yana_errors_user 
ON yana_acknowledged_errors(user_id, created_at DESC);

-- 3. Adaugă câmpuri în yana_self_model (dacă nu există)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'yana_self_model' AND column_name = 'self_intentions') THEN
    ALTER TABLE yana_self_model ADD COLUMN self_intentions JSONB DEFAULT '[]';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'yana_self_model' AND column_name = 'confidence_recovery_pending') THEN
    ALTER TABLE yana_self_model ADD COLUMN confidence_recovery_pending JSONB DEFAULT '[]';
  END IF;
END $$;

-- 4. Adaugă câmpuri în yana_relationships (dacă nu există)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'yana_relationships' AND column_name = 'relationship_intentions') THEN
    ALTER TABLE yana_relationships ADD COLUMN relationship_intentions JSONB DEFAULT '[]';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'yana_relationships' AND column_name = 'last_error_acknowledged_at') THEN
    ALTER TABLE yana_relationships ADD COLUMN last_error_acknowledged_at TIMESTAMPTZ;
  END IF;
END $$;

-- 5. Trigger pentru limita de 10 intenții active per user
CREATE OR REPLACE FUNCTION check_intention_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND (
    SELECT COUNT(*) FROM yana_intentions 
    WHERE user_id = NEW.user_id AND status = 'active'
  ) >= 10 THEN
    UPDATE yana_intentions 
    SET status = 'expired', updated_at = now()
    WHERE id = (
      SELECT id FROM yana_intentions 
      WHERE user_id = NEW.user_id AND status = 'active' 
      ORDER BY priority ASC, created_at ASC 
      LIMIT 1
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_intention_limit ON yana_intentions;
CREATE TRIGGER trigger_intention_limit
BEFORE INSERT ON yana_intentions
FOR EACH ROW EXECUTE FUNCTION check_intention_limit();

-- 6. Trigger pentru updated_at
CREATE OR REPLACE FUNCTION update_yana_intentions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_yana_intentions_updated_at ON yana_intentions;
CREATE TRIGGER trigger_yana_intentions_updated_at
BEFORE UPDATE ON yana_intentions
FOR EACH ROW EXECUTE FUNCTION update_yana_intentions_updated_at();

-- 7. Enable RLS
ALTER TABLE yana_intentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE yana_acknowledged_errors ENABLE ROW LEVEL SECURITY;

-- 8. Policies pentru yana_intentions
DROP POLICY IF EXISTS "Service role full access intentions" ON yana_intentions;
CREATE POLICY "Service role full access intentions" ON yana_intentions
FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own intentions" ON yana_intentions;
CREATE POLICY "Users can view own intentions" ON yana_intentions
FOR SELECT TO authenticated USING (auth.uid() = user_id OR user_id IS NULL);

-- 9. Policies pentru yana_acknowledged_errors
DROP POLICY IF EXISTS "Service role full access errors" ON yana_acknowledged_errors;
CREATE POLICY "Service role full access errors" ON yana_acknowledged_errors
FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own errors" ON yana_acknowledged_errors;
CREATE POLICY "Users can view own errors" ON yana_acknowledged_errors
FOR SELECT TO authenticated USING (auth.uid() = user_id);