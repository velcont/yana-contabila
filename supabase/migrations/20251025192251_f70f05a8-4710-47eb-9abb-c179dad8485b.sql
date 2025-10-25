-- Tabele pentru workflow per companie cu echipe separate

-- 1. Tabel pentru atribuiri membri pe companie
CREATE TABLE IF NOT EXISTS company_team_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES workflow_team_members(id) ON DELETE CASCADE,
  accountant_id UUID NOT NULL,
  role_on_company TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, team_member_id)
);

-- 2. Tabel pentru workflow-uri lunare pe companie
CREATE TABLE IF NOT EXISTS monthly_company_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  accountant_id UUID NOT NULL,
  month_year TEXT NOT NULL,
  template_id UUID REFERENCES monthly_workflow_templates(id) ON DELETE SET NULL,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  overall_status TEXT NOT NULL DEFAULT 'not_started',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, month_year)
);

-- RLS pentru company_team_assignments
ALTER TABLE company_team_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accountants can manage own company team assignments"
  ON company_team_assignments
  FOR ALL
  USING (auth.uid() = accountant_id)
  WITH CHECK (auth.uid() = accountant_id);

CREATE POLICY "Admins can view all company team assignments"
  ON company_team_assignments
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS pentru monthly_company_workflows
ALTER TABLE monthly_company_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accountants can manage own company workflows"
  ON monthly_company_workflows
  FOR ALL
  USING (auth.uid() = accountant_id)
  WITH CHECK (auth.uid() = accountant_id);

CREATE POLICY "Admins can view all company workflows"
  ON monthly_company_workflows
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index pentru performanță
CREATE INDEX idx_company_team_assignments_company ON company_team_assignments(company_id);
CREATE INDEX idx_company_team_assignments_member ON company_team_assignments(team_member_id);
CREATE INDEX idx_monthly_company_workflows_company_month ON monthly_company_workflows(company_id, month_year);

COMMENT ON TABLE company_team_assignments IS 'Atribuiri membri echipă pe fiecare companie în parte';
COMMENT ON TABLE monthly_company_workflows IS 'Workflow-uri lunare separate pentru fiecare companie cu taskuri și progres';