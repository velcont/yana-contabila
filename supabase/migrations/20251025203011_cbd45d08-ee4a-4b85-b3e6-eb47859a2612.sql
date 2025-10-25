-- Create client_verification_history table
CREATE TABLE IF NOT EXISTS client_verification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  verified_by UUID NOT NULL REFERENCES auth.users(id),
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_company_verif ON client_verification_history(company_id, created_at DESC);
CREATE INDEX idx_risk_level ON client_verification_history(risk_level);

-- Enable RLS
ALTER TABLE client_verification_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Accountants can view their clients verifications"
  ON client_verification_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = client_verification_history.company_id
      AND companies.managed_by_accountant_id = auth.uid()
    )
  );

CREATE POLICY "Accountants can insert verifications"
  ON client_verification_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = client_verification_history.company_id
      AND companies.managed_by_accountant_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert verifications"
  ON client_verification_history FOR INSERT
  WITH CHECK (true);