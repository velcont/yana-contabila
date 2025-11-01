-- =========================================
-- PERFORMANCE OPTIMIZATION: Missing Database Indexes
-- =========================================
-- This migration adds critical indexes for frequently queried columns
-- to improve query performance across CRM, accounting, and scheduling features.

-- 1. CLIENT_CONTACTS - For accountant client management
-- Most queries filter by company_id and search for primary contacts
CREATE INDEX IF NOT EXISTS idx_client_contacts_company_id 
ON public.client_contacts(company_id);

CREATE INDEX IF NOT EXISTS idx_client_contacts_primary 
ON public.client_contacts(company_id, is_primary) 
WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_client_contacts_email 
ON public.client_contacts(email) 
WHERE email IS NOT NULL;

-- 2. ACCOUNTANT_TASKS - For task management queries
-- Common queries: filter by assigned_to, assigned_by, company, status, due date
CREATE INDEX IF NOT EXISTS idx_accountant_tasks_assigned_to 
ON public.accountant_tasks(assigned_to, status, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_accountant_tasks_assigned_by 
ON public.accountant_tasks(assigned_by, status);

CREATE INDEX IF NOT EXISTS idx_accountant_tasks_company_id 
ON public.accountant_tasks(company_id, status);

CREATE INDEX IF NOT EXISTS idx_accountant_tasks_due_date 
ON public.accountant_tasks(due_date, status) 
WHERE status != 'completed';

CREATE INDEX IF NOT EXISTS idx_accountant_tasks_status 
ON public.accountant_tasks(status, due_date);

-- 3. SCHEDULED_EMAILS - For email scheduling system
-- Queries need fast lookup by accountant, status, and send time
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_accountant_id 
ON public.scheduled_emails(accountant_id, status);

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_send_at 
ON public.scheduled_emails(send_at, status) 
WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status_date 
ON public.scheduled_emails(status, send_at);

-- 4. FISCAL_DEADLINES - Critical for compliance tracking
-- Queries filter by accountant, company, status, and upcoming due dates
CREATE INDEX IF NOT EXISTS idx_fiscal_deadlines_accountant_id 
ON public.fiscal_deadlines(accountant_id, status, due_date);

CREATE INDEX IF NOT EXISTS idx_fiscal_deadlines_company_id 
ON public.fiscal_deadlines(company_id, due_date);

CREATE INDEX IF NOT EXISTS idx_fiscal_deadlines_pending 
ON public.fiscal_deadlines(due_date, status) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_fiscal_deadlines_status 
ON public.fiscal_deadlines(status, due_date);

-- 5. EMAIL_TEMPLATES - For template lookup
-- Common queries: active templates by accountant
CREATE INDEX IF NOT EXISTS idx_email_templates_accountant_id 
ON public.email_templates(accountant_id);

CREATE INDEX IF NOT EXISTS idx_email_templates_category 
ON public.email_templates(accountant_id, category);

CREATE INDEX IF NOT EXISTS idx_email_templates_default 
ON public.email_templates(is_default) 
WHERE is_default = true;

-- 6. CRM_MESSAGES - For client communication history
-- Queries need fast company, sender, and recipient lookups
CREATE INDEX IF NOT EXISTS idx_crm_messages_company_id 
ON public.crm_messages(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_messages_sender_id 
ON public.crm_messages(sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_messages_recipient_id 
ON public.crm_messages(recipient_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_messages_unread 
ON public.crm_messages(recipient_id, is_read) 
WHERE is_read = false;

-- Add comments for documentation
COMMENT ON INDEX idx_client_contacts_company_id IS 'Speeds up queries filtering client contacts by company';
COMMENT ON INDEX idx_accountant_tasks_assigned_to IS 'Composite index for accountant task dashboard queries';
COMMENT ON INDEX idx_scheduled_emails_send_at IS 'Optimizes queries for emails pending to be sent';
COMMENT ON INDEX idx_fiscal_deadlines_pending IS 'Partial index for pending compliance deadlines';
COMMENT ON INDEX idx_crm_messages_company_id IS 'Improves performance of client message history queries';
COMMENT ON INDEX idx_crm_messages_unread IS 'Optimizes unread message queries for users';