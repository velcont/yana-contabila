-- CRM pentru Firme de Contabilitate

-- 1. Extindem tabelul companies cu parametri fiscali detaliali
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS cui text,
ADD COLUMN IF NOT EXISTS caen_codes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tax_regime text, -- 'microintreprindere', 'impozit_profit', 'impozit_venit', etc.
ADD COLUMN IF NOT EXISTS vat_regime text, -- 'standard', 'cash_accounting', 'exempt', etc.
ADD COLUMN IF NOT EXISTS special_regime boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS fiscal_history jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS last_fiscal_update timestamp with time zone,
ADD COLUMN IF NOT EXISTS client_status text DEFAULT 'active', -- 'active', 'inactive', 'suspended'
ADD COLUMN IF NOT EXISTS client_category text, -- 'microintreprindere', 'imm', 'mare_contribuabil'
ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly'; -- 'monthly', 'quarterly', 'yearly'

-- 2. Tabel pentru contacte client (reprezentanți legali, contabili interni)
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text, -- 'reprezentant_legal', 'contabil_intern', 'manager', etc.
  email text,
  phone text,
  is_primary boolean DEFAULT false,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

-- 3. Tabel pentru documente client (facturi, bilanțuri, declarații)
CREATE TABLE IF NOT EXISTS public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  document_name text NOT NULL,
  document_type text, -- 'factura', 'bilant', 'declaratie', 'contract', etc.
  file_path text NOT NULL,
  file_size bigint,
  period text, -- 'Q1-2025', '2025', 'ianuarie-2025', etc.
  tags jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- 4. Tabel pentru termene fiscale și notificări
CREATE TABLE IF NOT EXISTS public.fiscal_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  accountant_id uuid NOT NULL, -- contabilul responsabil
  declaration_type text NOT NULL, -- 'D100', 'D300', 'D394', etc.
  declaration_name text NOT NULL,
  due_date date NOT NULL,
  period text, -- 'Q1-2025', 'ianuarie-2025', etc.
  status text DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'overdue'
  priority text DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  reminder_days integer DEFAULT 7, -- câte zile înainte să trimită reminder
  notes text,
  completed_at timestamp with time zone,
  completed_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.fiscal_deadlines ENABLE ROW LEVEL SECURITY;

-- 5. Tabel pentru tasks și atribuiri
CREATE TABLE IF NOT EXISTS public.accountant_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  assigned_to uuid NOT NULL, -- contabilul căruia i se atribuie
  assigned_by uuid NOT NULL, -- cine a atribuit task-ul
  title text NOT NULL,
  description text,
  task_type text, -- 'bilant', 'declaratie', 'consiliere', 'audit', etc.
  status text DEFAULT 'todo', -- 'todo', 'in_progress', 'review', 'completed', 'cancelled'
  priority text DEFAULT 'normal',
  due_date date,
  estimated_hours numeric,
  actual_hours numeric,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  tags jsonb DEFAULT '[]'::jsonb,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.accountant_tasks ENABLE ROW LEVEL SECURITY;

-- 6. Tabel pentru înregistrarea timpului lucrat
CREATE TABLE IF NOT EXISTS public.time_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.accountant_tasks(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  description text,
  hours numeric NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  is_billable boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.time_tracking ENABLE ROW LEVEL SECURITY;

-- 7. Tabel pentru template-uri de email
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id uuid NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  category text, -- 'reminder', 'notification', 'report', 'general'
  variables jsonb DEFAULT '[]'::jsonb, -- variabile dinamice: {client_name}, {due_date}, etc.
  is_default boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- 8. Tabel pentru email-uri programate
CREATE TABLE IF NOT EXISTS public.scheduled_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id uuid NOT NULL,
  company_ids uuid[] NOT NULL, -- array de company IDs pentru trimitere în masă
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  subject text NOT NULL,
  body text NOT NULL,
  send_at timestamp with time zone NOT NULL,
  status text DEFAULT 'scheduled', -- 'scheduled', 'sending', 'sent', 'failed', 'cancelled'
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  sent_at timestamp with time zone
);

ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;

-- 9. Tabel pentru configurare email SMTP
CREATE TABLE IF NOT EXISTS public.email_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accountant_id uuid NOT NULL UNIQUE,
  email_provider text NOT NULL, -- 'gmail', 'outlook', 'custom'
  smtp_host text,
  smtp_port integer,
  smtp_user text,
  smtp_password_encrypted text, -- vom cripta parola
  from_email text NOT NULL,
  from_name text,
  is_active boolean DEFAULT true,
  last_tested timestamp with time zone,
  test_status text, -- 'success', 'failed'
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.email_config ENABLE ROW LEVEL SECURITY;

-- 10. Tabel pentru mesagerie internă și cu clienții
CREATE TABLE IF NOT EXISTS public.crm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid, -- null pentru mesaje către companii
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  subject text,
  message text NOT NULL,
  is_internal boolean DEFAULT false, -- true = între contabili, false = cu clientul
  is_read boolean DEFAULT false,
  parent_message_id uuid REFERENCES public.crm_messages(id) ON DELETE CASCADE,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone
);

ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;

-- 11. Tabel pentru portal client (access tokens pentru clienți)
CREATE TABLE IF NOT EXISTS public.client_portal_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  access_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  is_active boolean DEFAULT true,
  last_login timestamp with time zone,
  login_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone
);

ALTER TABLE public.client_portal_access ENABLE ROW LEVEL SECURITY;

-- TRIGGERS pentru updated_at
CREATE OR REPLACE FUNCTION update_crm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_client_contacts_updated_at
  BEFORE UPDATE ON public.client_contacts
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER update_fiscal_deadlines_updated_at
  BEFORE UPDATE ON public.fiscal_deadlines
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER update_accountant_tasks_updated_at
  BEFORE UPDATE ON public.accountant_tasks
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

CREATE TRIGGER update_email_config_updated_at
  BEFORE UPDATE ON public.email_config
  FOR EACH ROW EXECUTE FUNCTION update_crm_updated_at();

-- RLS POLICIES

-- client_contacts policies
CREATE POLICY "Accountants can view managed client contacts"
  ON public.client_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = client_contacts.company_id
      AND c.managed_by_accountant_id = auth.uid()
    )
  );

CREATE POLICY "Accountants can insert client contacts"
  ON public.client_contacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = client_contacts.company_id
      AND c.managed_by_accountant_id = auth.uid()
    )
  );

CREATE POLICY "Accountants can update managed client contacts"
  ON public.client_contacts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = client_contacts.company_id
      AND c.managed_by_accountant_id = auth.uid()
    )
  );

CREATE POLICY "Accountants can delete managed client contacts"
  ON public.client_contacts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = client_contacts.company_id
      AND c.managed_by_accountant_id = auth.uid()
    )
  );

-- client_documents policies
CREATE POLICY "Accountants can view managed client documents"
  ON public.client_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = client_documents.company_id
      AND c.managed_by_accountant_id = auth.uid()
    )
  );

CREATE POLICY "Accountants can insert client documents"
  ON public.client_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = client_documents.company_id
      AND c.managed_by_accountant_id = auth.uid()
    )
    AND auth.uid() = uploaded_by
  );

CREATE POLICY "Accountants can delete managed client documents"
  ON public.client_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = client_documents.company_id
      AND c.managed_by_accountant_id = auth.uid()
    )
  );

-- fiscal_deadlines policies
CREATE POLICY "Accountants can view own fiscal deadlines"
  ON public.fiscal_deadlines FOR SELECT
  USING (accountant_id = auth.uid());

CREATE POLICY "Accountants can insert fiscal deadlines"
  ON public.fiscal_deadlines FOR INSERT
  WITH CHECK (accountant_id = auth.uid());

CREATE POLICY "Accountants can update own fiscal deadlines"
  ON public.fiscal_deadlines FOR UPDATE
  USING (accountant_id = auth.uid());

CREATE POLICY "Accountants can delete own fiscal deadlines"
  ON public.fiscal_deadlines FOR DELETE
  USING (accountant_id = auth.uid());

-- accountant_tasks policies
CREATE POLICY "Users can view assigned tasks"
  ON public.accountant_tasks FOR SELECT
  USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

CREATE POLICY "Accountants can insert tasks"
  ON public.accountant_tasks FOR INSERT
  WITH CHECK (assigned_by = auth.uid());

CREATE POLICY "Task owners can update tasks"
  ON public.accountant_tasks FOR UPDATE
  USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

CREATE POLICY "Task owners can delete tasks"
  ON public.accountant_tasks FOR DELETE
  USING (assigned_by = auth.uid());

-- time_tracking policies
CREATE POLICY "Users can view own time tracking"
  ON public.time_tracking FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own time tracking"
  ON public.time_tracking FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own time tracking"
  ON public.time_tracking FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own time tracking"
  ON public.time_tracking FOR DELETE
  USING (user_id = auth.uid());

-- email_templates policies
CREATE POLICY "Accountants can view own email templates"
  ON public.email_templates FOR SELECT
  USING (accountant_id = auth.uid());

CREATE POLICY "Accountants can insert email templates"
  ON public.email_templates FOR INSERT
  WITH CHECK (accountant_id = auth.uid());

CREATE POLICY "Accountants can update own email templates"
  ON public.email_templates FOR UPDATE
  USING (accountant_id = auth.uid());

CREATE POLICY "Accountants can delete own email templates"
  ON public.email_templates FOR DELETE
  USING (accountant_id = auth.uid());

-- scheduled_emails policies
CREATE POLICY "Accountants can view own scheduled emails"
  ON public.scheduled_emails FOR SELECT
  USING (accountant_id = auth.uid());

CREATE POLICY "Accountants can insert scheduled emails"
  ON public.scheduled_emails FOR INSERT
  WITH CHECK (accountant_id = auth.uid());

CREATE POLICY "Accountants can update own scheduled emails"
  ON public.scheduled_emails FOR UPDATE
  USING (accountant_id = auth.uid());

CREATE POLICY "Accountants can delete own scheduled emails"
  ON public.scheduled_emails FOR DELETE
  USING (accountant_id = auth.uid());

-- email_config policies
CREATE POLICY "Accountants can view own email config"
  ON public.email_config FOR SELECT
  USING (accountant_id = auth.uid());

CREATE POLICY "Accountants can insert email config"
  ON public.email_config FOR INSERT
  WITH CHECK (accountant_id = auth.uid());

CREATE POLICY "Accountants can update own email config"
  ON public.email_config FOR UPDATE
  USING (accountant_id = auth.uid());

CREATE POLICY "Accountants can delete own email config"
  ON public.email_config FOR DELETE
  USING (accountant_id = auth.uid());

-- crm_messages policies
CREATE POLICY "Users can view relevant messages"
  ON public.crm_messages FOR SELECT
  USING (
    sender_id = auth.uid() 
    OR recipient_id = auth.uid()
    OR (company_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = crm_messages.company_id
      AND c.managed_by_accountant_id = auth.uid()
    ))
  );

CREATE POLICY "Users can insert messages"
  ON public.crm_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Recipients can update messages"
  ON public.crm_messages FOR UPDATE
  USING (recipient_id = auth.uid() OR sender_id = auth.uid());

-- client_portal_access policies
CREATE POLICY "Accountants can view client portal access"
  ON public.client_portal_access FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = client_portal_access.company_id
      AND c.managed_by_accountant_id = auth.uid()
    )
  );

CREATE POLICY "Accountants can manage client portal access"
  ON public.client_portal_access FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = client_portal_access.company_id
      AND c.managed_by_accountant_id = auth.uid()
    )
  );