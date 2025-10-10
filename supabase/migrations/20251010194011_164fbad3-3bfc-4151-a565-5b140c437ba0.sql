-- Fix public data exposure by ensuring all sensitive tables deny anonymous access

-- Drop existing permissive policies and recreate them with explicit authentication requirements

-- PROFILES TABLE: Protect email addresses
DROP POLICY IF EXISTS "Users can read own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;

CREATE POLICY "Users can read own profile only"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- COMPANIES TABLE: Protect business information
DROP POLICY IF EXISTS "Users can view only their own companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON public.companies;

CREATE POLICY "Users can view only their own companies"
ON public.companies
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all companies"
ON public.companies
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- EMAIL_CONTACTS TABLE: Protect contact lists
DROP POLICY IF EXISTS "Users can view their own email contacts with rate limiting" ON public.email_contacts;

CREATE POLICY "Users can view their own email contacts with rate limiting"
ON public.email_contacts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND check_rate_limit(auth.uid(), 'email_contacts_query'::text, 10));

-- ANALYSES TABLE: Protect business analysis documents
DROP POLICY IF EXISTS "Users can view own analyses or admins can view all" ON public.analyses;

CREATE POLICY "Users can view own analyses or admins can view all"
ON public.analyses
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- CONVERSATION_HISTORY TABLE: Protect private conversations
DROP POLICY IF EXISTS "Users can view own conversations or admins can view all" ON public.conversation_history;

CREATE POLICY "Users can view own conversations or admins can view all"
ON public.conversation_history
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- LEGAL_DOCUMENT_ANALYSES TABLE: Protect legal documents
DROP POLICY IF EXISTS "Users can view their own document analyses" ON public.legal_document_analyses;

CREATE POLICY "Users can view their own document analyses"
ON public.legal_document_analyses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RESEARCH_DATA TABLE: Protect research data
DROP POLICY IF EXISTS "Users can view own research data" ON public.research_data;

CREATE POLICY "Users can view own research data"
ON public.research_data
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);